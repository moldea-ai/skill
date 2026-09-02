import { FindOrderInputSchema } from './contracts.js';

export const findOrderTool = {
  name: 'find_order',
  description: 'Finds one order by identifier.',
  input_schema: FindOrderInputSchema,
} as const;
