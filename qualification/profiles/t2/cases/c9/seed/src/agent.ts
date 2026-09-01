import { readFile } from 'node:fs/promises';

import { query } from '@anthropic-ai/claude-agent-sdk';

import { supportServer } from './tools.js';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

export const supportAgent = async (prompt: string) =>
  query({
    prompt,
    options: {
      mcpServers: { support: supportServer },
      systemPrompt: await loadSupportInstruction(),
      tools: ['mcp__support__lookup_order'],
    },
  });
