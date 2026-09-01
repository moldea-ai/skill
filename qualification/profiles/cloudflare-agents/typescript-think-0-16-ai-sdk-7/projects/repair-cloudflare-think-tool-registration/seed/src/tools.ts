import { tool } from 'ai';

import { LookupOrderInputSchema, LookupOrderOutputSchema } from './contracts.js';
import { lookupOrder } from './implementations.js';

export const lookupOrderTool = tool({
  description: 'Looks up one order by identifier.',
  inputSchema: LookupOrderInputSchema,
  outputSchema: LookupOrderOutputSchema,
  execute: lookupOrder,
});
