import { tool } from 'ai';

import { DelegateSupportInputSchema, SupportOutputSchema } from './contracts.js';
import { delegateSupport } from './delegation.js';

// function tool whose implementation calls another agent without declaring a handoff
export const delegateSupportTool = tool({
  inputSchema: DelegateSupportInputSchema,
  outputSchema: SupportOutputSchema,
  execute: delegateSupport,
});
