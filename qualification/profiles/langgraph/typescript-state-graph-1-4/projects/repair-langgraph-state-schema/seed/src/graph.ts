import { END, START, StateGraph } from '@langchain/langgraph';
import type { z } from 'zod';

import { SupportInputSchema, SupportOutputSchema, SupportStateSchema } from './contracts.js';

type ISupportState = z.infer<typeof SupportStateSchema>;

const answerQuestion = (state: ISupportState): Partial<ISupportState> => ({
  answer: state.question,
});

const builder = new StateGraph({
  state: SupportStateSchema,
  input: SupportInputSchema,
  output: SupportOutputSchema,
}).addNode('answer-question', answerQuestion);

builder.addEdge(START, 'answer-question');
builder.addEdge('answer-question', END);

export const supportGraph = builder.compile({ name: 'support_graph' });
