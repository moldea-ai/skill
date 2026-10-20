// the Git query for how one path is stored, with the plain repository-relative path appended
export const INSTRUCTION_GIT_STORAGE_ARGUMENTS = [
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
  '--stage',
  '-z',
  '--',
] as const;

// the Git query for whether links are checked out as links, the CLI's own query
export const INSTRUCTION_GIT_SYMLINK_SETTING_ARGUMENTS = [
  'config',
  '--type=bool',
  '--default=true',
  '--get',
  'core.symlinks',
] as const;

// instruction files validation reads even when Git ignores them
export const INSTRUCTION_PATHS: ReadonlySet<string> = new Set([
  '/AGENTS.md',
  '/CLAUDE.md',
  '/.claude/CLAUDE.md',
  '/CLAUDE.local.md',
]);

// bound on one Git query's output; a visited path prints at most a few short lines
export const INSTRUCTION_GIT_OUTPUT_BYTES = 4096;
