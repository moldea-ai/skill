import { z } from 'zod';

export const SupportOutputSchema = {
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
  },
  required: ['answer'],
  type: 'object' as const,
};

export const FindOrderInputSchema = {
  orderId: z.string(),
};
