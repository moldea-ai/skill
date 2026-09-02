import { FindOrderInputSchema } from './contracts.js';

export const findOrderTool = {
  type: 'function',
  name: 'find_order',
  description: 'Finds one order by identifier.',
  parameters: FindOrderInputSchema,
  strict: true,
} as const;
