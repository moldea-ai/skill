import { END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';

export const OrderTriageStateSchema = z.object({
  orderId: z.string(),
  category: z.enum(['fulfillment', 'refund-review']).optional(),
  requiresHumanReview: z.boolean().optional(),
});
export const OrderTriageInputSchema = z.object({ orderId: z.string() });
export const OrderTriageOutputSchema = z.object({
  category: z.enum(['fulfillment', 'refund-review']),
  requiresHumanReview: z.literal(true),
});

type IOrderTriageState = z.infer<typeof OrderTriageStateSchema>;

const classifyOrder = (state: IOrderTriageState): Partial<IOrderTriageState> => ({
  category: state.orderId.startsWith('R-') ? 'refund-review' : 'fulfillment',
  requiresHumanReview: true,
});

export const orderTriageGraph = new StateGraph({
  state: OrderTriageStateSchema,
  input: OrderTriageInputSchema,
  output: OrderTriageOutputSchema,
})
  .addNode('classify-order', classifyOrder)
  .addEdge(START, 'classify-order')
  .addEdge('classify-order', END)
  .compile({ name: 'order_triage_graph' });
