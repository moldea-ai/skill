import { lstat, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { getErrorCode } from 'jg-exception';
import { assertNoLinksBelow, ERRORS as FS_ERRORS } from 'jg-fs';
import {
  assertGitSucceeded,
  readChangedPaths,
  readIndexEntries,
  readStatus,
  resolveCommit,
  runGit,
} from 'jg-git-commands';
import { ERRORS as PROCESS_ERRORS } from 'jg-process';

import { createGitCommandOptions, isGitCommandError } from '../git-command/index.ts';
import { isPathWithin, readRepositoryFile } from '../repository-files.ts';

import {
  REPAIR_GIT_ATTRIBUTE_BYTES,
  REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS,
  REPAIR_GIT_INDEX_BYTES,
  REPAIR_GIT_ATTRIBUTE_PATHS,
  REPAIR_GIT_OUTPUT_BYTES,
  REPAIR_GIT_RESPONSE_BYTES,
} from './constants.ts';
import type { IRepairGitEvidence, IRepairGitOptions } from './types.ts';

const OBJECT_ID_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

// the jg-fs codes for a review path whose parent is a link or a file
const LINKED_PARENT_ERROR_CODES = new Set<string>([
  FS_ERRORS.NOT_A_DIRECTORY,
  FS_ERRORS.PATH_NOT_CANONICAL,
  FS_ERRORS.PATH_OUTSIDE_ROOT,
]);

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

// the options of a bounded Git read that sees the repository's own config, nothing global
const createReadOptions = (repositoryRoot: string, maxOutputBytes = REPAIR_GIT_OUTPUT_BYTES) =>
  createGitCommandOptions(repositoryRoot, 'repository', maxOutputBytes);

/**
 * Captures one fixed bounded Git read that sees the repository's own config, nothing global.
 * @throws If Git fails or its output exceeds the bounded capture limit.
 */
const readGit = async (repositoryRoot: string, arguments_: readonly string[]): Promise<Buffer> => {
  const result = await runGit(arguments_, {
    cwd: repositoryRoot,
    encoding: 'buffer',
    ...createReadOptions(repositoryRoot),
  });
  assertGitSucceeded(result, arguments_[0] ?? '');
  return result.stdout;
};

/**
 * Checks whether the repository stores an attribute source; an unset one exits with 1.
 * @throws If Git fails or its output exceeds the bounded capture limit.
 */
const hasStoredAttributeSource = async (repositoryRoot: string): Promise<boolean> => {
  const result = await runGit(REPAIR_GIT_ATTRIBUTE_SOURCE_ARGUMENTS, {
    cwd: repositoryRoot,
    encoding: 'buffer',
    ...createReadOptions(repositoryRoot),
  });
  if (result.exitCode === 1) return false;
  assertGitSucceeded(result, 'config');
  return result.stdout.length > 0;
};

/**
 * Refuses executable attributes and index fallbacks before any worktree-aware Git read.
 * @throws If attribute inspection is unsafe, exceeds a limit, or a Git read fails.
 */
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
  if (await hasStoredAttributeSource(repositoryRoot))
    throw new Error('Stored Git attribute sources cannot be verified safely.');
  const entries = await readIndexEntries(
    repositoryRoot,
    createReadOptions(repositoryRoot, REPAIR_GIT_INDEX_BYTES),
  );
  const paths = new Set(entries.map(({ path }) => validateEvidencePath(path)));
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

/**
 * Reads the commit HEAD points at, null before the first commit, and every status path, both sides
 * of a rename included. An untracked nested repository is its literal directory path.
 * @throws If Git fails, its output exceeds the bounded capture limit, or a path is unsupported.
 */
const readCheckpointStatus = async (
  repositoryRoot: string,
): Promise<{ commit: string | null; paths: string[] }> => {
  const { commit, entries } = await readStatus(repositoryRoot, createReadOptions(repositoryRoot));
  const paths = entries.flatMap(({ index, path, originalPath }) => [
    index === '?' ? path.replace(/\/$/u, '') : path,
    ...(originalPath === null ? [] : [originalPath]),
  ]);
  return { commit, paths: [...new Set(paths.map(validateEvidencePath))].sort() };
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
      try {
        await assertNoLinksBelow(repositoryRoot, join(repositoryRoot, path));
      } catch (error) {
        if (!LINKED_PARENT_ERROR_CODES.has(getErrorCode(error) ?? '')) throw error;
        throw new Error('Written-file review cannot follow directory links.', { cause: error });
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
        (await resolveCommit(
          repositoryRoot,
          options.checkpoint!,
          createReadOptions(repositoryRoot),
        )) !== options.checkpoint
      )
        throw new Error('The supplied checkpoint does not name a commit object.');
      if (options.mode === 'verify')
        return {
          kind: 'moldea-repair-git',
          mode: 'verify',
          status: 'available',
          commit: options.checkpoint,
          uncommittedPaths: [],
          changedPaths: [],
          manifestDiff: '',
          uncommittedManifestDiff: '',
          writtenDiff: '',
        };
    }
    const status = await readCheckpointStatus(repositoryRoot);
    if (status.commit === null)
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
        : (
            await readGit(repositoryRoot, [
              ...diffPrefix,
              status.commit,
              '--',
              'moldea/moldea.yaml',
            ])
          ).toString('utf8');
    const changedPaths =
      options.mode === 'continue'
        ? (
            await readChangedPaths(
              repositoryRoot,
              options.checkpoint!,
              createReadOptions(repositoryRoot),
            )
          ).map(validateEvidencePath)
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
          ? (
              await readGit(repositoryRoot, [
                ...diffPrefix,
                options.checkpoint!,
                '--',
                'moldea/moldea.yaml',
              ])
            ).toString('utf8')
          : '',
      uncommittedManifestDiff,
      writtenDiff:
        options.mode === 'review'
          ? (await readGit(repositoryRoot, [...diffPrefix, '--', ...paths])).toString('utf8')
          : '',
    };
    if (Buffer.byteLength(JSON.stringify(evidence)) > REPAIR_GIT_RESPONSE_BYTES - 1) {
      reasonCode = 'output-limit';
      throw new Error('Repair Git evidence exceeds the bounded response limit.');
    }
    return evidence;
  } catch (error) {
    if (
      error instanceof RangeError ||
      getErrorCode(error) === PROCESS_ERRORS.PROCESS_OUTPUT_TOO_LARGE
    )
      reasonCode = 'output-limit';
    else if (isGitCommandError(error)) reasonCode = 'git-read';
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
