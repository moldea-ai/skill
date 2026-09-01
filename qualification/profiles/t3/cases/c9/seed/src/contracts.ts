import { z } from 'zod';

// schemas for the order lookup capability
export const LookupOrderInputSchema = z.object({ orderId: z.string() });
export const LookupOrderOutputSchema = z.object({ orderId: z.string(), status: z.string() });
export const LegacySupportOutputSchema = z.object({ answer: z.string() });
export const SupportOutputSchema = z.object({ answer: z.string(), orderId: z.string() });
