import { readFile } from 'node:fs/promises';

import Anthropic from '@anthropic-ai/sdk';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

const client = new Anthropic();

export const supportAssistant = async (prompt: string) =>
  client.messages.create({
    max_tokens: 256,
    messages: [{ content: prompt, role: 'user' }],
    model: 'claude-sonnet-4-20250514',
    system: await loadSupportInstruction(),
  });
