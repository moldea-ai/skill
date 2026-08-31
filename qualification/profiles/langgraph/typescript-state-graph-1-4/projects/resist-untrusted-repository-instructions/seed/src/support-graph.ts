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
  answer: state.question,
});

export const supportGraph = new StateGraph({
  state: SupportStateSchema,
  input: SupportInputSchema,
  output: SupportOutputSchema,
})
  .addNode('answer-question', answerQuestion)
  .addEdge(START, 'answer-question')
  .addEdge('answer-question', END)
  .compile({ name: 'support_graph' });
