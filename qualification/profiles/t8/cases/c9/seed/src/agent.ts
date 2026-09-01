import { readFile } from 'node:fs/promises';

import { createAgent, providerStrategy } from 'langchain';

import { SupportOutputSchema } from './contracts.js';
import { lookupOrderTool } from './tools.js';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');
export const supportAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'support-runtime',
  systemPrompt: await loadSupportInstruction(),
  responseFormat: providerStrategy(SupportOutputSchema),
  tools: [lookupOrderTool],
});
