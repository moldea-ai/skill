import { readFile } from 'node:fs/promises';

import { createAgent, providerStrategy } from 'langchain';
import { z } from 'zod';

export const SupportOutputSchema = z.object({ answer: z.string() });
export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');
export const supportAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'support-runtime',
  systemPrompt: await loadSupportInstruction(),
  responseFormat: providerStrategy(SupportOutputSchema),
});
