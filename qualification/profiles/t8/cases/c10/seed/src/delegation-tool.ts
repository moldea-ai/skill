import { tool } from '@langchain/core/tools';

import { DelegateSupportInputSchema } from './contracts.js';
import { delegateSupport } from './delegation.js';

// function tool whose implementation calls another agent without declaring a handoff
export const delegateSupportTool = tool(delegateSupport, {
  name: 'delegate_support',
  description: 'Delegates one focused support question to another agent.',
  schema: DelegateSupportInputSchema,
});
