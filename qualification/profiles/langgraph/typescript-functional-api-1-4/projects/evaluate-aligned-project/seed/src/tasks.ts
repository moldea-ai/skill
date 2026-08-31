import { task } from '@langchain/langgraph';

export const lookupOrder = task('lookup_order', (orderId: string | undefined): string =>
  orderId === undefined ? 'No order identifier provided.' : `Order ${orderId} found.`,
);

export const summarizeRequest = task({ name: 'summarize_request' }, (request: string): string =>
  request.trim(),
);
