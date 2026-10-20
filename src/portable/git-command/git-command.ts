import { spawnSync } from 'node:child_process';

import {
  CLI_REMOVED_GIT_ENVIRONMENT_NAMES,
  HARDENED_GIT_CONFIGURATIONS,
  HARDENED_GIT_DIFF_CONFIGURATION,
  REMOVED_GIT_ENVIRONMENT_NAMES,
} from './constants.ts';
import type { IGitCommandOptions, IGitCommandResult } from './types.ts';

// a Git read that failed, exited unexpectedly, or could not start
export class GitCommandError extends Error {}

/** Builds the child environment: no inherited redirection, no fetch, literal pathspecs. */
const createEnvironment = (
  repositoryRoot: string,
  configScope: IGitCommandOptions['configScope'],
): NodeJS.ProcessEnv => {
  const removedNames = new Set<string>(
    configScope === 'cli'
      ? [...REMOVED_GIT_ENVIRONMENT_NAMES, ...CLI_REMOVED_GIT_ENVIRONMENT_NAMES]
      : REMOVED_GIT_ENVIRONMENT_NAMES,
  );
  const environment: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(process.env)) {
    const upperName = name.toUpperCase();
    if (
      removedNames.has(upperName) ||
      /^GIT_CONFIG_(?:KEY|VALUE)_/u.test(upperName) ||
      (configScope === 'cli' && upperName.startsWith('GIT_TRACE'))
    )
      continue;
    environment[name] = value;
  }
  return {
    ...environment,
    // reads never fetch missing objects; Git without GIT_NO_LAZY_FETCH needs the empty protocol list
    GIT_ALLOW_PROTOCOL: '',
    GIT_NO_LAZY_FETCH: '1',
    GIT_OPTIONAL_LOCKS: '0',
    GIT_WORK_TREE: repositoryRoot,
    GIT_LITERAL_PATHSPECS: '1',
    ...(configScope === 'repository'
      ? { GIT_ATTR_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
      : {}),
  };
};

/**
 * Runs one bounded read-only Git command from the repository root with hardened configuration.
 * The `repository` scope reads only the repository's own config; the `cli` scope also reads system
 * and global config, as the CLI does.
 * @param repositoryRoot The canonical absolute repository root.
 * @param gitArguments The Git subcommand and its arguments.
 * @param options The config scope, output bound, and accepted exit codes.
 * @returns The exit code and captured standard output.
 * @throws
 * - RangeError when output exceeds its bound.
 * - GitCommandError when Git cannot run, fails, or exits with an unaccepted code.
 */
export const runGitCommand = (
  repositoryRoot: string,
  gitArguments: readonly string[],
  options: IGitCommandOptions,
): IGitCommandResult => {
  if (process.platform === 'win32' && repositoryRoot.length >= 260)
    throw new GitCommandError(
      "The repository path exceeds Windows' 260-character working-directory limit for Git; move or clone it to a shorter path.",
    );
  // Git for Windows maps /dev/null to NUL but rejects Node's devNull spelling.
  const configurations: string[] = [...HARDENED_GIT_CONFIGURATIONS];
  if (gitArguments[0] === 'diff') configurations.push(HARDENED_GIT_DIFF_CONFIGURATION);
  const result = spawnSync(
    'git',
    [...configurations.flatMap((setting) => ['-c', setting]), '--no-pager', ...gitArguments],
    {
      cwd: repositoryRoot,
      encoding: 'buffer',
      env: createEnvironment(repositoryRoot, options.configScope),
      maxBuffer: options.maxOutputBytes,
      timeout: 30_000,
      windowsHide: true,
    },
  );
  if (result.error && 'code' in result.error && result.error.code === 'ENOBUFS')
    throw new RangeError('Git output exceeds its bounded capture limit.');
  const acceptedExitCodes = options.acceptedExitCodes ?? [0];
  if (result.error || result.status === null || !acceptedExitCodes.includes(result.status)) {
    const firstErrorLine = (
      result.stderr?.subarray(0, 512).toString('utf8') ||
      result.error?.message ||
      ''
    )
      .split(/[\r\n]/u, 1)[0]!
      .replace(/[\p{Cc}]/gu, ' ')
      .trim();
    throw new GitCommandError(
      `The bounded Git read failed or exceeded its limit.${firstErrorLine ? ` ${firstErrorLine}` : ''}`,
      { cause: result.error },
    );
  }
  return { status: result.status, stdout: result.stdout };
};
