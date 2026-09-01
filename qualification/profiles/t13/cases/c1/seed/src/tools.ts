import { tool } from 'ai';

import { FindOrderInputSchema, FindOrderOutputSchema } from './contracts.js';
import { findOrder } from './implementations.js';

export const findOrderTool = tool({
  inputSchema: FindOrderInputSchema,
  outputSchema: FindOrderOutputSchema,
  execute: findOrder,
});
