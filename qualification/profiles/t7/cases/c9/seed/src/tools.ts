import { LookupOrderInputSchema } from './contracts.js';

export const lookupOrderDeclaration = {
  name: 'lookup_order',
  description: 'Looks up one order by identifier.',
  parametersJsonSchema: LookupOrderInputSchema,
} as const;
