import type { z } from 'zod';

import type { DelegateSupportInputSchema } from './contracts.js';
import { StepSupportAgent } from './step-support-agent.js';

/** Delegates conceptually without using Cloudflare's agentTool handoff primitive. */
export const delegateSupport = ({
  prompt,
}: z.infer<typeof DelegateSupportInputSchema>): Promise<{ answer: string }> => {
  void StepSupportAgent;
  return Promise.resolve({ answer: `Queued for step support: ${prompt}` });
};
