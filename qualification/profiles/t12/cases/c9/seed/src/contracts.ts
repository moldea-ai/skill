import { z } from 'zod';

export const LookupOrderInputSchema = z.strictObject({ orderId: z.string() });
export const LookupOrderOutputSchema = z.strictObject({
  orderId: z.string(),
  status: z.string(),
});
