import { tool } from 'ai';

import { SupportStatusInputSchema, SupportStatusOutputSchema } from './contracts.js';
import { getStepSupportStatus, getSupportStatus } from './implementations.js';

// separate registrations keep the preparation relationships independently observable
export const supportStatusTool = tool({
  inputSchema: SupportStatusInputSchema,
  outputSchema: SupportStatusOutputSchema,
  execute: getSupportStatus,
});

export const stepSupportStatusTool = tool({
  inputSchema: SupportStatusInputSchema,
  outputSchema: SupportStatusOutputSchema,
  execute: getStepSupportStatus,
});
