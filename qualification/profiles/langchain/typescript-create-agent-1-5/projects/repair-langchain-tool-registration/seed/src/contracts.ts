import { z } from 'zod';

export const SupportOutputSchema = z.object({ answer: z.string() });
export const LookupOrderInputSchema = z.object({ orderId: z.string() });
