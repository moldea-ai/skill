import { LookupOrderInputSchema } from './contracts.js';

export const lookupOrderTool = {
  name: 'lookup_order',
  description: 'Looks up one order by identifier.',
  input_schema: LookupOrderInputSchema,
} as const;
