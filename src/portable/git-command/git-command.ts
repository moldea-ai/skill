import { getErrorCode } from 'jg-exception';
import { ERRORS as GIT_ERRORS } from 'jg-git-commands';
import { ERRORS as PROCESS_ERRORS } from 'jg-process';

import { GIT_LFS_FILTER_CONFIGURATIONS, WINDOWS_MAX_GIT_DIRECTORY_LENGTH } from './constants.ts';
import type { IGitCommandOptions, IGitConfigScope } from './types.ts';

// a Git read that can't run from the repository root
export class GitCommandError extends Error {}

// the codes of the errors a Git read rejects with: Git couldn't run, failed, or printed bad output
const GIT_READ_ERROR_CODES = new Set<string>([
  ...Object.values(GIT_ERRORS),
  ...Object.values(PROCESS_ERRORS),
]);

/**
 * Builds the runGit options of one bounded helper read from the repository root: its config scope
 * and output bound, the work tree pinned to the root, so a repository's `core.worktree` can't move
 * the attributes Git reads, and the LFS filters emptied.
 * @param repositoryRoot The canonical absolute repository root.
 * @param configScope The config files the read sees.
 * @param maxOutputBytes The bytes stdout and stderr may hold together.
 * @returns The options to pass to runGit or a jg-git-commands read.
 * @throws
 * - GitCommandError when the root is past the working-directory limit of Git for Windows.
 */
export const createGitCommandOptions = (
  repositoryRoot: string,
  configScope: IGitConfigScope,
  maxOutputBytes: number,
): IGitCommandOptions => {
  if (process.platform === 'win32' && repositoryRoot.length >= WINDOWS_MAX_GIT_DIRECTORY_LENGTH)
    throw new GitCommandError(
      "The repository path exceeds Windows' 260-character working-directory limit for Git; move or clone it to a shorter path.",
    );
  return {
    isolateConfig: configScope === 'repository',
    maxOutputBytes,
    env: {
      GIT_WORK_TREE: repositoryRoot,
      GIT_CONFIG_COUNT: String(GIT_LFS_FILTER_CONFIGURATIONS.length),
      ...Object.fromEntries(
        GIT_LFS_FILTER_CONFIGURATIONS.flatMap(([key, value], index) => [
          [`GIT_CONFIG_KEY_${index}`, key],
          [`GIT_CONFIG_VALUE_${index}`, value],
        ]),
      ),
    },
  };
};

/**
 * Checks whether an error came from a Git read: it couldn't run from the root, Git failed or
 * printed output the read never prints, or the read timed out or exceeded its output bound.
 * @param error The error.
 * @returns Whether it did.
 */
export const isGitCommandError = (error: unknown): boolean =>
  error instanceof GitCommandError || GIT_READ_ERROR_CODES.has(getErrorCode(error) ?? '');
