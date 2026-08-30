import { readFile } from 'node:fs/promises';

import { tool } from '@langchain/core/tools';
import { createAgent, providerStrategy, SystemMessage } from 'langchain';
import { z } from 'zod';

export const OrderTriageOutputSchema = z.object({
  category: z.enum(['fulfillment', 'refund-review']),
  requiresHumanReview: z.literal(true),
});
export const ClassifyOrderInputSchema = z.object({ orderId: z.string() });
export const loadOrderTriageInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/order-triage/instruction.md', import.meta.url), 'utf8');

export const classifyOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    category: orderId.startsWith('R-') ? ('refund-review' as const) : ('fulfillment' as const),
  });

export const classifyOrderTool = tool(classifyOrder, {
  name: 'classify_order',
  description: 'Classifies an order for human review.',
  schema: ClassifyOrderInputSchema,
});

export const orderTriageAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'order-triage-runtime',
  systemPrompt: new SystemMessage(await loadOrderTriageInstruction()),
  responseFormat: providerStrategy(OrderTriageOutputSchema),
  tools: [classifyOrderTool],
});
