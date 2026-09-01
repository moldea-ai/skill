import type { IDelegateSupportInput, ISupportOutput } from './contracts.js';
import { stepSupportAgent } from './step-support-agent.js';

/** Delegates one prompt without establishing a canonical handoff relationship. */
export const delegateSupport = async ({
  prompt,
}: IDelegateSupportInput): Promise<ISupportOutput> => {
  const result = await stepSupportAgent.generate({
    options: { requestId: 'delegated-support' },
    prompt,
  });

  return { answer: result.text };
};
