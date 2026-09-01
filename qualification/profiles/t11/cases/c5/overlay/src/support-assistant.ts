import { readFile } from 'node:fs/promises';

import OpenAI from 'openai';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

const client = new OpenAI();

export const supportAssistant = async (prompt: string) =>
  client.responses.create({
    input: prompt,
    model: 'gpt-5',
    instructions: await loadSupportInstruction(),
  });
