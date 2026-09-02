import type { z } from 'zod';

import type { FindOrderInputSchema } from './contracts.js';

export const findOrder = (
  input: z.infer<typeof FindOrderInputSchema>,
): Promise<{ orderId: string; status: string }> =>
  Promise.resolve({
    orderId: input.orderId,
    status: 'awaiting-review',
  });
