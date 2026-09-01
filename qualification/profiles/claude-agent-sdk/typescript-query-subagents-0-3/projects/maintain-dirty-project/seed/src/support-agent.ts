import { readFile } from 'node:fs/promises';

import { query } from '@anthropic-ai/claude-agent-sdk';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

export const supportAgent = async (prompt: string) =>
  query({
    prompt,
    options: {
      systemPrompt: await loadSupportInstruction(),
    },
  });
