import type { z } from 'zod';

import type { StatusInputSchema } from './contracts.js';

export const getStatus = (
  input: z.infer<typeof StatusInputSchema>,
): Promise<{ ticketId: string; status: string }> =>
  Promise.resolve({
    ticketId: input.ticketId,
    status: 'awaiting-review',
  });
