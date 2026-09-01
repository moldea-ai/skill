import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';

import { FindOrderInputSchema } from './contracts.js';
import { findOrder } from './implementations.js';

export const findOrderTool = tool(
  'find_order',
  'Finds one order by identifier.',
  FindOrderInputSchema,
  findOrder,
);

export const supportServer = createSdkMcpServer({
  name: 'support-tools',
  tools: [findOrderTool],
  version: '1.0.0',
});
