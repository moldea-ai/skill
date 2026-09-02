import { tool } from '@openai/agents';

import { LookupOrderInputSchema, LookupOrderOutputSchema } from './contracts.js';
import { lookupOrder } from './implementations.js';

export const lookupOrderTool = tool({
  name: 'lookup_order',
  description: 'Looks up one order by identifier.',
  parameters: LookupOrderInputSchema,
  outputSchema: LookupOrderOutputSchema,
  execute: lookupOrder,
});
