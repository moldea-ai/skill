import { tool } from '@langchain/core/tools';

import { FindOrderInputSchema } from './contracts.js';
import { findOrder } from './implementations.js';

export const findOrderTool = tool(findOrder, {
  name: 'find_order',
  description: 'Finds one order by identifier.',
  schema: FindOrderInputSchema,
});
