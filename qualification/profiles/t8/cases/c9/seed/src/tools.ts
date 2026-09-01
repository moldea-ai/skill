import { tool } from '@langchain/core/tools';

import { LookupOrderInputSchema } from './contracts.js';
import { lookupOrder } from './implementations.js';

export const lookupOrderTool = tool(lookupOrder, {
  name: 'lookup_order',
  description: 'Looks up one order by identifier.',
  schema: LookupOrderInputSchema,
});
