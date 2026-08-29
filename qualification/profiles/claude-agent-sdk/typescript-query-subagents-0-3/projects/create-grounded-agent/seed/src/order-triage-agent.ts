import { readFile } from 'node:fs/promises';

import { createSdkMcpServer, query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

export const ClassifyOrderInputSchema = {
  orderId: z.string(),
};

export const loadOrderTriageInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/order-triage/instruction.md', import.meta.url), 'utf8');

export const classifyOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    content: [
      {
        text: JSON.stringify({
          category: orderId.startsWith('R-') ? 'refund-review' : 'fulfillment',
        }),
        type: 'text' as const,
      },
    ],
  });

export const classifyOrderTool = tool(
  'classify_order',
  'Classifies an order for human review.',
  ClassifyOrderInputSchema,
  classifyOrder,
);

export const orderServer = createSdkMcpServer({
  name: 'order-tools',
  tools: [classifyOrderTool],
  version: '1.0.0',
});

export const orderTriageAgent = async (prompt: string) =>
  query({
    prompt,
    options: {
      mcpServers: { orders: orderServer },
      systemPrompt: await loadOrderTriageInstruction(),
      tools: ['mcp__orders__classify_order'],
    },
  });
