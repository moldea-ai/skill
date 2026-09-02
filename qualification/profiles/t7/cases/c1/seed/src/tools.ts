import { FindOrderInputSchema } from './contracts.js';

export const findOrderDeclaration = {
  name: 'find_order',
  description: 'Finds one order by identifier.',
  parametersJsonSchema: FindOrderInputSchema,
} as const;
