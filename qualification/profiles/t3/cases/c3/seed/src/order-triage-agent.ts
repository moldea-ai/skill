import { AIChatAgent } from '@cloudflare/ai-chat';
import { Output, streamText, tool } from 'ai';
import { z } from 'zod';

export const OrderTriageOutputSchema = z.object({
  category: z.enum(['fulfillment', 'refund-review']),
  requiresHumanReview: z.literal(true),
});
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
export class OrderTriageAgent extends AIChatAgent {
  public override onChatMessage(
    onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    options?: Parameters<AIChatAgent['onChatMessage']>[1],
  ): Promise<Response> {
    void onFinish;
    void options;

    const result = streamText({
      model: 'openai/gpt-5',
      prompt: 'Classify the latest order request.',
      instructions: loadOrderTriageInstruction(),
      output: Output.object({ schema: OrderTriageOutputSchema }),
      tools: { classify_order: classifyOrderTool },
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
