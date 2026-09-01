import { readFile } from 'node:fs/promises';

import { generateText, Output, tool } from 'ai';
import { z } from 'zod';

export const OrderTriageOutputSchema = z.object({
  category: z.enum(['fulfillment', 'refund-review']),
  requiresHumanReview: z.literal(true),
});
export const ClassifyOrderInputSchema = z.object({ orderId: z.string() });
export const ClassifyOrderOutputSchema = z.object({
  category: z.enum(['fulfillment', 'refund-review']),
});

export const loadOrderTriageInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/order-triage/instruction.md', import.meta.url), 'utf8');

export const classifyOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    category: orderId.startsWith('R-') ? ('refund-review' as const) : ('fulfillment' as const),
  });

export const classifyOrderTool = tool({
  inputSchema: ClassifyOrderInputSchema,
  outputSchema: ClassifyOrderOutputSchema,
  execute: classifyOrder,
});

export const orderTriageAgent = async (prompt: string) =>
  generateText({
    model: 'openai/gpt-5',
    prompt,
    instructions: await loadOrderTriageInstruction(),
    output: Output.object({ schema: OrderTriageOutputSchema }),
    tools: { classify_order: classifyOrderTool },
  });
