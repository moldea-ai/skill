import { tool } from 'ai';

import { SupportStatusInputSchema, SupportStatusOutputSchema } from './contracts.js';
import { getSupportStatus } from './implementations.js';

export const supportStatusTool = tool({
  description: 'Reads one support order status.',
  inputSchema: SupportStatusInputSchema,
  outputSchema: SupportStatusOutputSchema,
  execute: getSupportStatus,
});
