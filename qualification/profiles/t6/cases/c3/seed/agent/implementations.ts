import type { z } from 'zod';

import type { ClassifyOrderInputSchema } from './contracts.js';

export const classifyOrder = (
  input: z.infer<typeof ClassifyOrderInputSchema>,
): Promise<{ classification: 'manual-review'; orderId: string }> =>
  Promise.resolve({
    classification: 'manual-review',
    orderId: input.orderId,
  });
