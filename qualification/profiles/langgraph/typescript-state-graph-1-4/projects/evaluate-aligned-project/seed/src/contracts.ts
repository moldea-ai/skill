import { z } from 'zod';

export const SupportStateSchema = z.object({
  question: z.string(),
  orderId: z.string().optional(),
  orderFinding: z.string().optional(),
  draftAnswer: z.string().optional(),
  answer: z.string().optional(),
});
export const SupportInputSchema = z.object({
  question: z.string(),
  orderId: z.string().optional(),
});
export const SupportOutputSchema = z.object({ answer: z.string().optional() });

export const SummaryStateSchema = z.object({
  request: z.string(),
  summary: z.string().optional(),
});
export const SummaryInputSchema = z.object({ request: z.string() });
export const SummaryOutputSchema = z.object({ summary: z.string().optional() });
