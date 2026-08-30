import { defineTool } from 'eve/tools';

import { ClassifyOrderInputSchema, ClassifyOrderOutputSchema } from '../contracts.js';
import { classifyOrder } from '../implementations.js';

export default defineTool({
  description: 'Classifies one order for human review.',
  inputSchema: ClassifyOrderInputSchema,
  outputSchema: ClassifyOrderOutputSchema,
  execute: classifyOrder,
});
