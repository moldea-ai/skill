import { tool } from 'ai';

import { DelegateSupportInputSchema, DelegateSupportOutputSchema } from './contracts.js';
import { delegateSupport } from './delegation.js';

export const delegateSupportTool = tool({
  description: 'Delegates one focused support question to another agent.',
  inputSchema: DelegateSupportInputSchema,
  outputSchema: DelegateSupportOutputSchema,
  execute: delegateSupport,
});
