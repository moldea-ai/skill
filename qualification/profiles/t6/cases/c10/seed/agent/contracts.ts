import { z } from 'zod';

export const StatusInputSchema = z.object({ ticketId: z.string() });
export const StatusOutputSchema = z.object({ ticketId: z.string(), status: z.string() });
