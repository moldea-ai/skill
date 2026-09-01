import { z } from 'zod';

export const SupportOutputSchema = z.strictObject({ response: z.string() });
export const FindOrderInputSchema = z.strictObject({ orderId: z.string() });
export const FindOrderOutputSchema = z.strictObject({
  orderId: z.string(),
  status: z.string(),
});
