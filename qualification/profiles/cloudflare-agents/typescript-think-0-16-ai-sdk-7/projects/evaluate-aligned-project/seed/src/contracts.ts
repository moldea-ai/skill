import { z } from 'zod';

// schemas for the repository-local order tool
export const FindOrderInputSchema = z.object({ orderId: z.string() });
export const FindOrderOutputSchema = z.object({ orderId: z.string(), status: z.string() });
