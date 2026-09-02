import { readFile } from 'node:fs/promises';

import { Agent } from '@openai/agents';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

export const supportAssistant = new Agent({
  name: 'support',
  instructions: loadSupportInstruction,
});
