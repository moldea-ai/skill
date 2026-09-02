import { entrypoint, task } from '@langchain/langgraph';

const summarize = task('summarize_request', (value: string): string => value.trim());
const escalate = task('escalate_request', (value: string): string => `Escalate: ${value}`);

const runSelectedTask = async (
  selectedTask: (value: string) => Promise<string>,
  value: string,
): Promise<string> => selectedTask(value);

export const dynamicSupportWorkflow = entrypoint(
  'dynamic_support_workflow',
  async (input: { related: string[]; request: string; route: string }) => {
    const selectedTask = input.route === 'summary' ? summarize : escalate;
    const primary = await runSelectedTask(selectedTask, input.request);
    const related = await Promise.all(input.related.map(async (value) => summarize(value)));

    return { primary, related };
  },
);
