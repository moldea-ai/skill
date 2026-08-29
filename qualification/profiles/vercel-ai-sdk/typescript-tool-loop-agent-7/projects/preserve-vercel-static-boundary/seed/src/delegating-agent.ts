import { Output, ToolLoopAgent } from 'ai';

import { DelegateSupportInputSchema, SupportOutputSchema } from './contracts.js';
import { delegateSupportTool } from './delegation-tool.js';
import { loadDelegatingSupportInstruction } from './instructions.js';

// ordinary ToolLoopAgent with a function tool that calls stepSupportAgent
export const delegatingSupportAgent = new ToolLoopAgent({
  id: 'delegating-support-runtime',
  model: 'openai/gpt-5',
  instructions: await loadDelegatingSupportInstruction(),
  callOptionsSchema: DelegateSupportInputSchema,
  output: Output.object({ schema: SupportOutputSchema }),
  tools: { delegate_support: delegateSupportTool },
});
