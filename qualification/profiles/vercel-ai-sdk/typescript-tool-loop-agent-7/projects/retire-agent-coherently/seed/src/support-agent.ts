import { readFile } from 'node:fs/promises';

import { Output, ToolLoopAgent } from 'ai';
import { z } from 'zod';

export const SupportInputSchema = z.object({ prompt: z.string() });
export const SupportOutputSchema = z.object({ answer: z.string() });
export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');
export const supportAgent = new ToolLoopAgent({
  id: 'support-runtime',
  model: 'openai/gpt-5',
  instructions: await loadSupportInstruction(),
  callOptionsSchema: SupportInputSchema,
  output: Output.object({ schema: SupportOutputSchema }),
});
