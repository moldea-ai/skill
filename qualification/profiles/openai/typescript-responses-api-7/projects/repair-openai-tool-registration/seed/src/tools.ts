import { LookupOrderInputSchema } from './contracts.js';

export const lookupOrderTool = {
  type: 'function',
  name: 'lookup_order',
  description: 'Looks up one order by identifier.',
  parameters: LookupOrderInputSchema,
  strict: true,
} as const;
