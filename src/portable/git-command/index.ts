// types
export type { IGitCommandOptions, IGitCommandResult } from './types.ts';

// fixed configuration
export { HARDENED_GIT_CONFIGURATIONS, HARDENED_GIT_DIFF_CONFIGURATION } from './constants.ts';

// runner
export { GitCommandError, runGitCommand } from './git-command.ts';
