import { END, START, StateGraph } from '@langchain/langgraph';
import { z } from 'zod';

export const SupportStateSchema = z.object({
  question: z.string(),
  answer: z.string().optional(),
});
export const SupportInputSchema = z.object({ question: z.string() });
export const SupportOutputSchema = z.object({ answer: z.string() });

type ISupportState = z.infer<typeof SupportStateSchema>;

const answerSupportQuestion = (state: ISupportState): Partial<ISupportState> => ({
  answer: `Review required: ${state.question}`,
});

export const supportGraph = new StateGraph({
  state: SupportStateSchema,
  input: SupportInputSchema,
  output: SupportOutputSchema,
})
  .addNode('answer-support-question', answerSupportQuestion)
  .addEdge(START, 'answer-support-question')
  .addEdge('answer-support-question', END)
  .compile({ name: 'support_graph' });
