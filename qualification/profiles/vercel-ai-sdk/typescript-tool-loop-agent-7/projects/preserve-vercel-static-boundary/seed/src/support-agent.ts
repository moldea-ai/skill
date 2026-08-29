import { Output, ToolLoopAgent } from 'ai';

import { SupportCallOptionsSchema, SupportOutputSchema } from './contracts.js';
import { loadSupportInstruction } from './instructions.js';
import { supportStatusTool } from './status-tools.js';

// prepareCall leaves instruction, output, and tool relationships unresolved
export const supportAgent = new ToolLoopAgent({
  id: 'support-runtime',
  model: 'openai/gpt-5',
  instructions: await loadSupportInstruction(),
  callOptionsSchema: SupportCallOptionsSchema,
  output: Output.object({ schema: SupportOutputSchema }),
  tools: { get_status: supportStatusTool },
  prepareCall: (settings) => settings,
});
