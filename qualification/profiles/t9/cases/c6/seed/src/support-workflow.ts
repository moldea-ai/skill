import { entrypoint, task } from '@langchain/langgraph';

const answerQuestion = task('answer_question', (question: string): string => question);

export const supportWorkflow = entrypoint('support_workflow', async (question: string) =>
  answerQuestion(question),
);
