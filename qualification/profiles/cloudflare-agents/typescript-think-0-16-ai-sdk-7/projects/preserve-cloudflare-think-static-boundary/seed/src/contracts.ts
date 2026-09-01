import { z } from 'zod';

// schemas for the boundary fixture's ordinary function tools
export const SupportStatusInputSchema = z.object({ orderId: z.string() });
export const SupportStatusOutputSchema = z.object({ status: z.string() });
export const DelegateSupportInputSchema = z.object({ prompt: z.string() });
export const DelegateSupportOutputSchema = z.object({ answer: z.string() });
