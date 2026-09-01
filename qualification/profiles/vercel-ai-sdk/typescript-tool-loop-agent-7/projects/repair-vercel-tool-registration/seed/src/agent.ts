import { readFile } from 'node:fs/promises';

import { Output, ToolLoopAgent } from 'ai';

import { SupportInputSchema, SupportOutputSchema } from './contracts.js';
import { lookupOrderTool } from './tools.js';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');
export const supportAgent = new ToolLoopAgent({
  id: 'support-runtime',
  model: 'openai/gpt-5',
  instructions: await loadSupportInstruction(),
  callOptionsSchema: SupportInputSchema,
  output: Output.object({ schema: SupportOutputSchema }),
  tools: { lookup_order: lookupOrderTool },
});
