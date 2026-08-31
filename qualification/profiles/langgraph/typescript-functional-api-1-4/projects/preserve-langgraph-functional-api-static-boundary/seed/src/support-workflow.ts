import { entrypoint, getPreviousState, interrupt, task } from '@langchain/langgraph';

interface ISupportInput {
  orderId: string;
}

interface ISupportSavedState {
  lastOrderId: string;
}

const lookupOrder = task(
  { name: 'lookup_order' },
  (orderId: string): string => `Review required for ${orderId}`,
);

export const supportWorkflow = entrypoint(
  { name: 'support_workflow' },
  async (input: ISupportInput) => {
    const previous = getPreviousState<ISupportSavedState>();
    const orderStatus = await lookupOrder(input.orderId);
    const isApproved = interrupt<{ orderId: string; orderStatus: string }, boolean>({
      orderId: input.orderId,
      orderStatus,
    });

    return entrypoint.final<string, ISupportSavedState>({
      value: `${orderStatus}; approved: ${isApproved}; previous: ${previous?.lastOrderId ?? 'none'}`,
      save: { lastOrderId: input.orderId },
    });
  },
);
