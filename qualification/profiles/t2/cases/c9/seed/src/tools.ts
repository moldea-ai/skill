import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';

import { LookupOrderInputSchema } from './contracts.js';
import { lookupOrder } from './implementations.js';

export const lookupOrderTool = tool(
  'lookup_order',
  'Looks up one order by identifier.',
  LookupOrderInputSchema,
  lookupOrder,
);

export const supportServer = createSdkMcpServer({
  name: 'support-tools',
  tools: [lookupOrderTool],
  version: '1.0.0',
});
