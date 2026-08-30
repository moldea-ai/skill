import { z } from 'zod';

export const SupportOutputSchema = z.object({ answer: z.string() });
export const FindOrderInputSchema = z.object({ orderId: z.string() });
export const FindOrderOutputSchema = z.object({ orderId: z.string(), status: z.string() });
