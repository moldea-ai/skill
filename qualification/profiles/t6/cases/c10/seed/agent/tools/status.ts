import { defineTool } from 'eve/tools';

import { StatusInputSchema, StatusOutputSchema } from '../contracts.js';
import { getStatus } from '../implementations.js';

export default defineTool({
  description: 'Reads one support ticket status.',
  inputSchema: StatusInputSchema,
  outputSchema: StatusOutputSchema,
  execute: getStatus,
});
