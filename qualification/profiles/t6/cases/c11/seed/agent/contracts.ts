import { z } from 'zod';

export const SupportOutputSchema = z.object({ answer: z.string() });
