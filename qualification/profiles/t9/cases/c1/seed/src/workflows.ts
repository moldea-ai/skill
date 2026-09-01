import { entrypoint, getPreviousState } from '@langchain/langgraph';

import { lookupOrder, summarizeRequest } from './tasks.js';

interface ISupportInput {
  orderId?: string;
  question: string;
}

interface ISupportSavedState {
  lastQuestion: string;
}

export const supportWorkflow = entrypoint(
  { name: 'support_workflow' },
  async (input: ISupportInput) => {
    const previous = getPreviousState<ISupportSavedState>();
    const orderFinding = await lookupOrder(input.orderId);
    const prefix = previous === undefined ? '' : `Previous: ${previous.lastQuestion}. `;

    return entrypoint.final<string, ISupportSavedState>({
      value: `${prefix}${orderFinding} Review required: ${input.question}`,
      save: { lastQuestion: input.question },
    });
  },
);

export const summaryWorkflow = entrypoint('summary_workflow', async (request: string) =>
  summarizeRequest(request),
);
