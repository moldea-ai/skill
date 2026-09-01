import { entrypoint, interrupt, task } from '@langchain/langgraph';

interface IOrderTriageResult {
  category: 'fulfillment' | 'refund-review';
  requiresHumanReview: true;
}

const classifyOrder = task('classify_order', (orderId: string): IOrderTriageResult => ({
  category: orderId.startsWith('R-') ? 'refund-review' : 'fulfillment',
  requiresHumanReview: true,
}));

export const orderTriageWorkflow = entrypoint(
  'order_triage_workflow',
  async (orderId: string): Promise<IOrderTriageResult> => {
    const result = await classifyOrder(orderId);

    interrupt<IOrderTriageResult, boolean>(result);

    return result;
  },
);
