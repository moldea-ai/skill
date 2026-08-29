import { z } from 'zod';

export const SupportInputSchema = z.object({ prompt: z.string() });
export const SupportOutputSchema = z.object({ answer: z.string() });
export const LookupOrderInputSchema = z.object({ orderId: z.string() });
export const LookupOrderOutputSchema = z.object({ orderId: z.string(), status: z.string() });
