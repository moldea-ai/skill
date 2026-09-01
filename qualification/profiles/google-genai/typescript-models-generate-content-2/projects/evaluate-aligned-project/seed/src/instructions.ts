import { readFile } from 'node:fs/promises';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

export const loadSummaryInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/summary/instruction.md', import.meta.url), 'utf8');
