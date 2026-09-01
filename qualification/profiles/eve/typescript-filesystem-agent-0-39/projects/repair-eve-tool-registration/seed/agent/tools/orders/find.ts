import { defineTool } from 'eve/tools';

import { FindOrderInputSchema, FindOrderOutputSchema } from '../../contracts.js';
import { findOrder } from '../../implementations.js';

export default defineTool({
  description: 'Finds one order by identifier.',
  inputSchema: FindOrderInputSchema,
  outputSchema: FindOrderOutputSchema,
  execute: findOrder,
});
