import { readFileSync } from 'node:fs';

/** Loads the support instruction. */
export const loadSupportInstruction = (): string =>
  readFileSync(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

/** Loads the session-prepared support instruction. */
export const loadStepSupportInstruction = (): string =>
  readFileSync(new URL('../moldea/agents/step-support/instruction.md', import.meta.url), 'utf8');

/** Loads the delegating support instruction. */
export const loadDelegatingSupportInstruction = (): string =>
  readFileSync(
    new URL('../moldea/agents/delegating-support/instruction.md', import.meta.url),
    'utf8',
  );
