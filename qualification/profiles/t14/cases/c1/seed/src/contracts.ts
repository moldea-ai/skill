import { z } from 'zod';

export const SupportInputSchema = z.object({ prompt: z.string() });
export const SupportOutputSchema = z.object({ answer: z.string() });
export const SummaryInputSchema = z.object({ prompt: z.string() });
export const SummaryOutputSchema = z.object({ summary: z.string() });
export const FindOrderInputSchema = z.object({ orderId: z.string() });
export const FindOrderOutputSchema = z.object({ orderId: z.string(), status: z.string() });
