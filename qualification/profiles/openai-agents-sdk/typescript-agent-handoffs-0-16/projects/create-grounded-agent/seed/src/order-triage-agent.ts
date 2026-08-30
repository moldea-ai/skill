import { readFile } from 'node:fs/promises';

import { Agent, tool } from '@openai/agents';
import { z } from 'zod';

export const OrderTriageOutputSchema = z.strictObject({ category: z.string() });
export const ClassifyOrderInputSchema = z.strictObject({ orderId: z.string() });
export const ClassifyOrderOutputSchema = z.strictObject({ category: z.string() });

export const loadOrderTriageInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/order-triage/instruction.md', import.meta.url), 'utf8');

export const classifyOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    category: orderId.startsWith('R-') ? ('refund-review' as const) : ('fulfillment' as const),
  });

export const classifyOrderTool = tool({
  name: 'classify_order',
  description: 'Classifies an order for human review.',
  parameters: ClassifyOrderInputSchema,
  outputSchema: ClassifyOrderOutputSchema,
  execute: classifyOrder,
});

export const orderTriageAgent = new Agent({
  name: 'order-triage',
  instructions: loadOrderTriageInstruction,
  outputType: OrderTriageOutputSchema,
  tools: [classifyOrderTool],
});
