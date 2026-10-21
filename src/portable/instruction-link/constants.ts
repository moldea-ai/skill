// instruction files validation reads even when Git ignores them
export const INSTRUCTION_PATHS: ReadonlySet<string> = new Set([
  '/AGENTS.md',
  '/CLAUDE.md',
  '/.claude/CLAUDE.md',
  '/CLAUDE.local.md',
]);

// bound on one Git query's output; a visited path prints at most a few short lines
export const INSTRUCTION_GIT_OUTPUT_BYTES = 4096;
