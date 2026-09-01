import { Output, ToolLoopAgent } from 'ai';

import {
  SummaryInputSchema,
  SummaryOutputSchema,
  SupportInputSchema,
  SupportOutputSchema,
} from './contracts.js';
import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool } from './tools.js';

export const supportAgent = new ToolLoopAgent({
  id: 'support-runtime',
  model: 'openai/gpt-5',
  instructions: await loadSupportInstruction(),
  callOptionsSchema: SupportInputSchema,
  output: Output.object({ schema: SupportOutputSchema }),
  tools: { find_order: findOrderTool },
});

export const summaryAgent = new ToolLoopAgent({
  id: 'summary-runtime',
  model: 'openai/gpt-5',
  instructions: await loadSummaryInstruction(),
  callOptionsSchema: SummaryInputSchema,
  output: Output.object({ schema: SummaryOutputSchema }),
});
