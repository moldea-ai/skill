import { spawnSync } from 'node:child_process';
import { lstat, realpath } from 'node:fs/promises';
import { devNull } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import { isPathWithin, readRepositoryFile } from '../repository-files.ts';

import {
  REPAIR_GIT_ATTRIBUTE_BYTES,
  REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS,
  REPAIR_GIT_INDEX_BYTES,
  REPAIR_GIT_ATTRIBUTE_PATHS,
  REPAIR_GIT_COMMON_CONFIGURATIONS,
  REPAIR_GIT_INDEX_ARGUMENTS,
  REPAIR_GIT_OUTPUT_BYTES,
  REPAIR_GIT_RESPONSE_BYTES,
} from './constants.ts';
import type { IRepairGitEvidence, IRepairGitOptions } from './types.ts';

const OBJECT_ID_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

/** Validates structural Git output without interpreting filename punctuation as arguments. */
const validateEvidencePath = (path: string): string => {
  if (
    path.length === 0 ||
    isAbsolute(path) ||
    /^[a-z]:/iu.test(path) ||
    path.includes('\0') ||
    path.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('Git returned unsupported repository path evidence.');
  }
  return path;
};

/** Reviews only literal paths; the fixed Git environment disables pathspec interpretation. */
const validatePath = (path: string): string => {
  validateEvidencePath(path);
  if (/[\\\p{Cc}]/u.test(path))
    throw new Error('Written-file review path is excluded or unsupported.');
  return path;
};

/** Captures only a fixed bounded Git read, respecting the host's executable boundary. */
const readGit = (repositoryRoot: string, arguments_: readonly string[]): Buffer => {
  const configurations = REPAIR_GIT_COMMON_CONFIGURATIONS.map((setting) =>
    setting.startsWith('core.attributesFile=') ? `core.attributesFile=${devNull}` : setting,
  );
  if (arguments_[0] === 'diff') configurations.push('diff.external=');
  const environment = { ...process.env };
  for (const name of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_COMMON_DIR',
    'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES',
    'GIT_ATTR_SOURCE',
    'GIT_CONFIG',
    'GIT_CONFIG_PARAMETERS',
    'GIT_CONFIG_COUNT',
    'GIT_GLOB_PATHSPECS',
    'GIT_NOGLOB_PATHSPECS',
    'GIT_ICASE_PATHSPECS',
  ])
    delete environment[name];
  for (const name of Object.keys(environment))
    if (/^GIT_CONFIG_(?:KEY|VALUE)_/u.test(name)) delete environment[name];
  const result = spawnSync(
    'git',
    [...configurations.flatMap((setting) => ['-c', setting]), '--no-pager', ...arguments_],
    {
      cwd: repositoryRoot,
      encoding: 'buffer',
      env: {
        ...environment,
        GIT_ATTR_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: devNull,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_OPTIONAL_LOCKS: '0',
        GIT_WORK_TREE: repositoryRoot,
        GIT_LITERAL_PATHSPECS: '1',
      },
      maxBuffer: arguments_[0] === 'ls-files' ? REPAIR_GIT_INDEX_BYTES : REPAIR_GIT_OUTPUT_BYTES,
      timeout: 30_000,
      windowsHide: true,
    },
  );
  if (
    result.status === 1 &&
    arguments_.length === REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS.length &&
    arguments_.every((argument, index) => argument === REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS[index])
  )
    return Buffer.alloc(0);
  if (result.error && 'code' in result.error && result.error.code === 'ENOBUFS')
    throw new RangeError('Repair Git output exceeds its bounded capture limit.');
  if (result.error || result.status !== 0) {
    throw new Error('The bounded repair Git read failed or exceeded its limit.');
  }
  return result.stdout;
};

/** Decodes complete NUL-delimited filenames without shell or Git quote interpretation. */
const readPaths = (bytes: Buffer): string[] => {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text).equals(bytes) || (text !== '' && !text.endsWith('\0'))) {
    throw new Error('Git returned incomplete or unsupported path evidence.');
  }
  return text.split('\0').filter(Boolean).map(validateEvidencePath);
};

/** Refuses executable attributes and index fallbacks before any worktree-aware Git read. */
const assertAttributeSafety = async (repositoryRoot: string): Promise<void> => {
  const gitPath = join(repositoryRoot, '.git');
  const gitStat = await lstat(gitPath);
  let gitDirectory = gitPath;
  if (gitStat.isFile()) {
    const declaration = (
      await readRepositoryFile(repositoryRoot, gitPath, REPAIR_GIT_ATTRIBUTE_BYTES, 'reject')
    ).toString('utf8');
    const match = /^gitdir: ([^\0\r\n]+)\r?\n?$/u.exec(declaration);
    if (!match) throw new Error('Git directory evidence is invalid.');
    gitDirectory = resolve(repositoryRoot, match[1]!);
  } else if (!gitStat.isDirectory()) {
    throw new Error('Git directory safety is unavailable for this repository.');
  }
  if ((await realpath(gitDirectory)) !== gitDirectory)
    throw new Error('Git metadata directory safety is unavailable.');
  let commonDirectory = gitDirectory;
  try {
    const declaration = (
      await readRepositoryFile(
        gitDirectory,
        join(gitDirectory, 'commondir'),
        REPAIR_GIT_ATTRIBUTE_BYTES,
        'reject',
      )
    )
      .toString('utf8')
      .trim();
    if (!declaration || /[\0\r\n]/u.test(declaration))
      throw new Error('Git common directory evidence is invalid.');
    commonDirectory = resolve(gitDirectory, declaration);
    if ((await realpath(commonDirectory)) !== commonDirectory)
      throw new Error('Git common directory safety is unavailable.');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  if (!(await lstat(commonDirectory)).isDirectory())
    throw new Error('Git common directory safety is unavailable.');
  if (readGit(repositoryRoot, REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS).length > 0)
    throw new Error('Stored Git attribute sources cannot be verified safely.');
  const paths = readPaths(readGit(repositoryRoot, REPAIR_GIT_INDEX_ARGUMENTS));
  const attributes = new Set<string>([join(repositoryRoot, '.gitattributes')]);
  for (const path of paths) {
    if (path.split('/').at(-1) === '.gitattributes') {
      const attributePath = join(repositoryRoot, path);
      // a missing indexed attribute file would make Git consume an unseen index fallback
      if (!(await lstat(attributePath)).isFile())
        throw new Error('Git attribute fallback is unverified.');
    }
    let directory = dirname(join(repositoryRoot, path));
    while (directory !== repositoryRoot) {
      if (!isPathWithin(repositoryRoot, directory))
        throw new Error('Git attribute path escapes the repository.');
      const attribute = join(directory, '.gitattributes');
      if (attributes.has(attribute)) break;
      attributes.add(attribute);
      if (attributes.size > REPAIR_GIT_ATTRIBUTE_PATHS)
        throw new RangeError('Git attribute inspection exceeds its path limit.');
      directory = dirname(directory);
    }
  }
  const infoAttributes = join(commonDirectory, 'info', 'attributes');
  attributes.add(infoAttributes);
  if (attributes.size > REPAIR_GIT_ATTRIBUTE_PATHS)
    throw new RangeError('Git attribute inspection exceeds its path limit.');
  let totalBytes = 0;
  for (const path of attributes) {
    let bytes: Buffer;
    try {
      bytes = await readRepositoryFile(
        path === infoAttributes ? commonDirectory : repositoryRoot,
        path,
        REPAIR_GIT_ATTRIBUTE_BYTES,
        'reject',
      );
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') continue;
      throw error;
    }
    totalBytes += bytes.length;
    if (totalBytes > REPAIR_GIT_OUTPUT_BYTES)
      throw new RangeError('Git attribute inspection exceeds its aggregate byte limit.');
    if (bytes.includes(Buffer.from('filter'))) {
      throw new Error(
        'Repository attribute safety is unavailable; no worktree Git read was performed.',
      );
    }
  }
};

/** Parses branch identity and all status paths, including both sides of a rename. */
const readStatus = (bytes: Buffer): { commit: string; paths: string[] } => {
  const text = bytes.toString('utf8');
  if (!Buffer.from(text).equals(bytes) || !text.endsWith('\0'))
    throw new Error('Git status evidence is incomplete.');
  const records = text.split('\0').slice(0, -1);
  let commit: string | null = null;
  const paths: string[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]!;
    if (record.startsWith('# branch.oid ')) {
      const oid = record.slice('# branch.oid '.length);
      if (!OBJECT_ID_PATTERN.test(oid)) {
        if (oid === '(initial)') return { commit: '', paths: [] };
        throw new Error('The checkpoint commit is unavailable.');
      }
      if (commit !== null) throw new Error('Git returned multiple commit identities.');
      commit = oid;
    } else if (record.startsWith('# ')) {
      continue;
    } else if (record.startsWith('? ')) {
      paths.push(validateEvidencePath(record.slice(2).replace(/\/$/u, '')));
    } else {
      const fields = record[0] === '1' ? 7 : record[0] === '2' ? 8 : record[0] === 'u' ? 9 : null;
      const match =
        fields === null ? null : new RegExp(`^[12u](?: [^ ]+){${fields}} (.+)$`, 'su').exec(record);
      if (match === null) throw new Error('Git returned unsupported status evidence.');
      paths.push(validateEvidencePath(match[1]!));
      if (record[0] === '2') paths.push(validateEvidencePath(records[++index] ?? ''));
    }
  }
  if (commit === null) throw new Error('The checkpoint commit is unavailable.');
  return { commit, paths: [...new Set(paths)].sort() };
};

/**
 * Collects bounded mechanical repair evidence without repository code or Git writes.
 * Unavailable evidence always requires the existing conservative reassessment rule.
 * @returns Available facts or a bounded explicit limitation, never an invented checkpoint.
 */
export const collectRepairGitEvidence = async (
  options: IRepairGitOptions,
): Promise<IRepairGitEvidence> => {
  let reasonCode: Extract<IRepairGitEvidence, { status: 'unavailable' }>['reasonCode'] =
    'arguments';
  try {
    if (!isAbsolute(options.repositoryRoot))
      throw new Error('An absolute repository root is required.');
    const repositoryRoot = await realpath(resolve(options.repositoryRoot));
    if (!(await lstat(repositoryRoot)).isDirectory())
      throw new Error('A repository directory is required.');
    if (
      ['continue', 'verify'].includes(options.mode) &&
      !OBJECT_ID_PATTERN.test(options.checkpoint ?? '')
    ) {
      throw new Error('Continuation requires the supplied full checkpoint object ID.');
    }
    if (!['checkpoint', 'continue', 'review', 'verify'].includes(options.mode))
      throw new Error('Unsupported repair Git operation.');
    const paths = (options.paths ?? []).map(validatePath);
    if ((options.mode === 'review') !== paths.length > 0)
      throw new Error('Only written-file review accepts literal paths.');
    for (const path of paths) {
      if (!isPathWithin(repositoryRoot, resolve(repositoryRoot, path)))
        throw new Error('Written-file review path escapes the repository.');
      let directory = repositoryRoot;
      for (const component of path.split('/').slice(0, -1)) {
        directory = join(directory, component);
        try {
          if (!(await lstat(directory)).isDirectory())
            throw new Error('Written-file review cannot follow directory links.');
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') break;
          throw error;
        }
      }
      try {
        const stat = await lstat(join(repositoryRoot, path));
        if (!stat.isFile())
          throw new Error('Written-file review requires regular files or deleted paths.');
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
      }
    }
    reasonCode = 'attribute-safety';
    await assertAttributeSafety(repositoryRoot);
    reasonCode = 'git-read';
    if (options.mode === 'verify' || options.mode === 'continue') {
      if (
        readGit(repositoryRoot, ['cat-file', '-t', options.checkpoint!]).toString('utf8').trim() !==
        'commit'
      )
        throw new Error('The supplied checkpoint does not name a commit object.');
      if (options.mode === 'verify')
        return {
          kind: 'moldea-repair-git',
          mode: 'verify',
          status: 'available',
          commit: options.checkpoint!,
          uncommittedPaths: [],
          changedPaths: [],
          manifestDiff: '',
          uncommittedManifestDiff: '',
          writtenDiff: '',
        };
    }
    const status = readStatus(
      readGit(repositoryRoot, [
        'status',
        '--porcelain=v2',
        '-z',
        '--ignore-submodules=all',
        '--untracked-files=all',
        '--branch',
      ]),
    );
    if (!status.commit)
      return {
        kind: 'moldea-repair-git',
        mode: options.mode,
        status: 'unavailable',
        reasonCode: 'commit-unavailable',
        reason:
          'The checkpoint commit is unavailable in an unborn repository; reassess every completed owner.',
      };
    const diffPrefix = ['diff', '--no-ext-diff', '--no-textconv', '--ignore-submodules=all'];
    const uncommittedManifestDiff =
      options.mode === 'review'
        ? ''
        : readGit(repositoryRoot, [
            ...diffPrefix,
            status.commit,
            '--',
            'moldea/moldea.yaml',
          ]).toString('utf8');
    const changedPaths =
      options.mode === 'continue'
        ? readPaths(
            readGit(repositoryRoot, [
              ...diffPrefix,
              '--name-only',
              '--no-renames',
              '-z',
              options.checkpoint!,
              '--',
              '.',
            ]),
          )
        : [];
    const evidence: IRepairGitEvidence = {
      kind: 'moldea-repair-git',
      mode: options.mode,
      status: 'available',
      commit: status.commit,
      uncommittedPaths: status.paths,
      changedPaths: [...new Set([...changedPaths, ...status.paths])].sort(),
      manifestDiff:
        options.mode === 'continue'
          ? readGit(repositoryRoot, [
              ...diffPrefix,
              options.checkpoint!,
              '--',
              'moldea/moldea.yaml',
            ]).toString('utf8')
          : '',
      uncommittedManifestDiff,
      writtenDiff:
        options.mode === 'review'
          ? readGit(repositoryRoot, [...diffPrefix, '--', ...paths]).toString('utf8')
          : '',
    };
    if (Buffer.byteLength(JSON.stringify(evidence)) > REPAIR_GIT_RESPONSE_BYTES - 1) {
      reasonCode = 'output-limit';
      throw new Error('Repair Git evidence exceeds the bounded response limit.');
    }
    return evidence;
  } catch (error) {
    if (error instanceof RangeError) reasonCode = 'output-limit';
    // all errors here come from fixed local operations; do not expose Git stderr or configuration
    const reason = error instanceof Error ? error.message : 'Repair Git evidence is unavailable.';
    return {
      kind: 'moldea-repair-git',
      mode: options.mode,
      status: 'unavailable',
      reasonCode,
      reason: reason.slice(0, 512),
    };
  }
};
