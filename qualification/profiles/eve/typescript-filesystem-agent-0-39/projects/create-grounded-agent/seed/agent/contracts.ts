import { z } from 'zod';

export const OrderTriageOutputSchema = z.object({
  classification: z.enum(['manual-review', 'insufficient-evidence']),
  reason: z.string(),
});
export const ClassifyOrderInputSchema = z.object({ orderId: z.string(), notes: z.string() });
export const ClassifyOrderOutputSchema = z.object({
  classification: z.literal('manual-review'),
  orderId: z.string(),
});
