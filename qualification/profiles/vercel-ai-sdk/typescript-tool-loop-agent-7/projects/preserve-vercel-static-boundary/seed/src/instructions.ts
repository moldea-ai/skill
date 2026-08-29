import { readFile } from 'node:fs/promises';

/** Loads the call-prepared support instruction. */
export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

/** Loads the step-prepared support instruction. */
export const loadStepSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/step-support/instruction.md', import.meta.url), 'utf8');

/** Loads the delegating support instruction. */
export const loadDelegatingSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/delegating-support/instruction.md', import.meta.url), 'utf8');
