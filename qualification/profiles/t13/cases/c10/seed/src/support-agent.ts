import { readFile } from 'node:fs/promises';

import { generateText } from 'ai';

const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

const buildRequest = (prompt: string) => ({
  model: 'openai/gpt-5',
  prompt,
  prepareStep: async () => ({ instructions: await loadSupportInstruction() }),
});

export const supportAgent = async (prompt: string) => generateText(buildRequest(prompt));
