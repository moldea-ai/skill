import { tool } from 'langchain';

import { SupportStatusInputSchema } from './contracts.js';
import { getSupportStatus } from './implementations.js';

export const supportStatusTool = tool(getSupportStatus, {
  name: 'get_status',
  description: 'Reads one support order status.',
  schema: SupportStatusInputSchema,
});

// one-argument headless tool does not prove a repository-local implementation
export const stepSupportStatusTool = tool({
  name: 'get_status',
  description: 'Requests one support order status from the client.',
  schema: SupportStatusInputSchema,
});
