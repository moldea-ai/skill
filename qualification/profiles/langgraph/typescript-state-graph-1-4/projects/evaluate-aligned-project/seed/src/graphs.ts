import { END, START, StateGraph } from '@langchain/langgraph';
import type { z } from 'zod';

import {
  SummaryInputSchema,
  SummaryOutputSchema,
  SummaryStateSchema,
  SupportInputSchema,
  SupportOutputSchema,
  SupportStateSchema,
} from './contracts.js';

type ISupportState = z.infer<typeof SupportStateSchema>;
type ISummaryState = z.infer<typeof SummaryStateSchema>;

const lookupOrder = (state: ISupportState): Partial<ISupportState> => ({
  orderFinding:
    state.orderId === undefined ? 'No order identifier provided.' : `Order ${state.orderId} found.`,
});

const draftAnswer = (state: ISupportState): Partial<ISupportState> => ({
  draftAnswer: `Review required: ${state.question}`,
});

const finalizeAnswer = (state: ISupportState): Partial<ISupportState> => ({
  answer: `${state.orderFinding ?? 'Order unavailable'} ${state.draftAnswer ?? ''}`.trim(),
});

const supportBuilder = new StateGraph({
  state: SupportStateSchema,
  input: SupportInputSchema,
  output: SupportOutputSchema,
})
  .addNode('lookup-order', lookupOrder)
  .addNode('draft-answer', draftAnswer)
  .addNode('finalize-answer', finalizeAnswer);

supportBuilder.addEdge(START, 'lookup-order');
supportBuilder.addEdge(START, 'draft-answer');
supportBuilder.addEdge(['lookup-order', 'draft-answer'], 'finalize-answer');
supportBuilder.addEdge('finalize-answer', END);

export const supportGraph = supportBuilder.compile({ name: 'support_graph' });

const summarizeRequest = (state: ISummaryState): Partial<ISummaryState> => ({
  summary: state.request,
});

const finishSummary = (): 'finish' => 'finish';

export const summaryGraph = new StateGraph({
  state: SummaryStateSchema,
  input: SummaryInputSchema,
  output: SummaryOutputSchema,
})
  .addNode('summarize-request', summarizeRequest)
  .addEdge(START, 'summarize-request')
  .addConditionalEdges('summarize-request', finishSummary, { finish: END })
  .compile({ name: 'summary_graph' });
