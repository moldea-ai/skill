import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { getErrorCode } from 'jg-exception';
import { assertNoLinksBelow, ERRORS as FS_ERRORS, isPathWithin } from 'jg-fs';
import {
  assertGitSucceeded,
  readChangedPaths,
  readStatus,
  resolveCommit,
  runGit,
} from 'jg-git-commands';
import { ERRORS as PROCESS_ERRORS } from 'jg-process';

import { createGitCommandOptions, isGitCommandError } from '../git-command/index.ts';

import { assertAttributeSafety } from './attribute-safety.ts';
import { REPAIR_GIT_OUTPUT_BYTES, REPAIR_GIT_RESPONSE_BYTES } from './constants.ts';
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
    await assertAttributeSafety(repositoryRoot, validateEvidencePath);
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
