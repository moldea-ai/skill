import { z } from 'zod';

// schemas and inferred contracts shared by the boundary agents and tools
export const SupportCallOptionsSchema = z.object({ requestId: z.string() });
export type ISupportCallOptions = z.infer<typeof SupportCallOptionsSchema>;

export const SupportOutputSchema = z.object({ answer: z.string() });
export type ISupportOutput = z.infer<typeof SupportOutputSchema>;

export const SupportStatusInputSchema = z.object({ orderId: z.string() });
export type ISupportStatusInput = z.infer<typeof SupportStatusInputSchema>;

export const SupportStatusOutputSchema = z.object({ status: z.string() });
export type ISupportStatusOutput = z.infer<typeof SupportStatusOutputSchema>;

export const DelegateSupportInputSchema = z.object({ prompt: z.string() });
export type IDelegateSupportInput = z.infer<typeof DelegateSupportInputSchema>;
