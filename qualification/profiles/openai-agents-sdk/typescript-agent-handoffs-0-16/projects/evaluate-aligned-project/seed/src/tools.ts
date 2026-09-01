import { tool } from '@openai/agents';

import { FindOrderInputSchema, FindOrderOutputSchema } from './contracts.js';
import { findOrder } from './implementations.js';

export const findOrderTool = tool({
  name: 'find_order',
  description: 'Finds one order by identifier.',
  parameters: FindOrderInputSchema,
  outputSchema: FindOrderOutputSchema,
  execute: findOrder,
});
