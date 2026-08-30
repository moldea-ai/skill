import { readFile } from 'node:fs/promises';

import OpenAI from 'openai';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

const client = new OpenAI();

const providerWebSearchTool = {
  type: 'web_search',
} as const;

export const supportAgent = async (prompt: string) =>
  client.responses.create({
    input: prompt,
    model: 'gpt-5',
    instructions: await loadSupportInstruction(),
    tools: [providerWebSearchTool],
  });

export const dynamicSupportAgent = (prompt: string) => {
  const request = {
    input: prompt,
    model: 'gpt-5',
  };

  return client.responses.create(request);
};
