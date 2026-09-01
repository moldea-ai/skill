import { entrypoint, task } from '@langchain/langgraph';

const summarize = task('summarize', (value: string): string => value.trim());
const escalate = task('escalate', (value: string): string => `Escalate: ${value}`);

export const dynamicWorkflow = entrypoint(
  'dynamic_workflow',
  async (input: { route: string; value: string }) => {
    const selectedTask = input.route === 'summary' ? summarize : escalate;

    return selectedTask(input.value);
  },
);
