import { z } from 'zod';

// schemas and inferred contracts shared by the boundary agents and tools
export const SupportOutputSchema = z.object({ answer: z.string() });
export type ISupportOutput = z.infer<typeof SupportOutputSchema>;

export const EscalationOutputSchema = z.object({ escalationReason: z.string() });

export const SupportStateSchema = z.object({ requestId: z.string() });
export const SupportContextSchema = z.object({ accountId: z.string() });

export const SupportStatusInputSchema = z.object({ orderId: z.string() });
export type ISupportStatusInput = z.infer<typeof SupportStatusInputSchema>;

export const SupportStatusOutputSchema = z.object({ status: z.string() });
export type ISupportStatusOutput = z.infer<typeof SupportStatusOutputSchema>;

export const DelegateSupportInputSchema = z.object({ prompt: z.string() });
export type IDelegateSupportInput = z.infer<typeof DelegateSupportInputSchema>;

export const GraphStateSchema = z.object({ message: z.string() });
export const GraphInputSchema = z.object({ prompt: z.string() });
export const GraphOutputSchema = z.object({ answer: z.string() });
