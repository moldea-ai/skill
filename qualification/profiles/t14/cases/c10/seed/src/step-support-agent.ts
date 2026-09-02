import { Output, ToolLoopAgent } from 'ai';

import { SupportCallOptionsSchema, SupportOutputSchema } from './contracts.js';
import { loadStepSupportInstruction } from './instructions.js';
import { stepSupportStatusTool } from './status-tools.js';

// prepareStep leaves only the instruction relationship unresolved
export const stepSupportAgent = new ToolLoopAgent({
  id: 'step-support-runtime',
  model: 'openai/gpt-5',
  instructions: await loadStepSupportInstruction(),
  callOptionsSchema: SupportCallOptionsSchema,
  output: Output.object({ schema: SupportOutputSchema }),
  tools: { get_status: stepSupportStatusTool },
  prepareStep: async () => ({ instructions: await loadStepSupportInstruction() }),
});
