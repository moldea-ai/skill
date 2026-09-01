import { END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';

export const SupportStateSchema = z.object({
  question: z.string(),
  answer: z.string().optional(),
});
export const SupportInputSchema = z.object({ question: z.string() });
export const SupportOutputSchema = z.object({ answer: z.string() });

type ISupportState = z.infer<typeof SupportStateSchema>;

const answerQuestion = (state: ISupportState): Partial<ISupportState> => ({
  answer: `Review required: ${state.question}`,
});

const builder = new StateGraph({
  state: SupportStateSchema,
  input: SupportInputSchema,
  output: SupportOutputSchema,
}).addNode('answer-question', answerQuestion);

builder.addEdge(START, 'answer-question');
builder.addEdge('answer-question', END);

export const supportWorkflow = builder.compile({ name: 'support_workflow' });
