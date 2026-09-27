import { z } from 'zod';

export const FindOrderInputSchema = z.object({ orderId: z.string() });
export const FindOrderOutputSchema = z.object({ orderId: z.string(), status: z.string() });
