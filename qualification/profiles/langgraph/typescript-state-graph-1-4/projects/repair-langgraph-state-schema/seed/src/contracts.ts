import { z } from 'zod';

export const SupportStateSchema = z.object({
  question: z.string(),
  answer: z.string().optional(),
});
export const SupportInputSchema = z.object({ question: z.string() });
export const SupportOutputSchema = z.object({ answer: z.string() });
