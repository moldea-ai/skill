import { END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';

export const SupportStateSchema = z.object({
  orderId: z.string(),
  orderStatus: z.string().optional(),
});
export const SupportInputSchema = z.object({ orderId: z.string() });
export const SupportOutputSchema = z.object({ orderStatus: z.string() });

type ISupportState = z.infer<typeof SupportStateSchema>;

const lookupOrder = (state: ISupportState): Partial<ISupportState> => ({
  orderStatus: `Review required for ${state.orderId}`,
});

const builder = new StateGraph({
  state: SupportStateSchema,
  input: SupportInputSchema,
  output: SupportOutputSchema,
}).addNode('lookup-order', lookupOrder, { metadata: { responsibility: 'lookup' } });

builder.addEdge(START, 'lookup-order');
builder.addEdge('lookup-order', END);

export const supportGraph = builder.compile({
  name: 'support_graph',
  description: 'Routes support requests to the appropriate workflow.',
});
