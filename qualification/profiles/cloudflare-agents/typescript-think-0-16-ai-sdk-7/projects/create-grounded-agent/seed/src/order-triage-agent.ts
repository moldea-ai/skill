import { Think } from '@cloudflare/think';
import { tool } from 'ai';
import { z } from 'zod';

export const ClassifyOrderInputSchema = z.object({ orderId: z.string() });
export const ClassifyOrderOutputSchema = z.object({
  category: z.enum(['fulfillment', 'refund-review']),
  requiresHumanReview: z.literal(true),
});

export const loadOrderTriageInstruction = (): string =>
  'Classify each order for human review. Never approve a refund.';

export const classifyOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    category: orderId.startsWith('R-') ? ('refund-review' as const) : ('fulfillment' as const),
    requiresHumanReview: true as const,
  });

export const classifyOrderTool = tool({
  description: 'Classifies an order for human review.',
  inputSchema: ClassifyOrderInputSchema,
  outputSchema: ClassifyOrderOutputSchema,
  execute: classifyOrder,
});

/** Classifies orders for human review without refund authority. */
export class OrderTriageAgent extends Think {
  public override getSystemPrompt(): string {
    return loadOrderTriageInstruction();
  }

  public override getTools() {
    return { classify_order: classifyOrderTool };
  }
}
