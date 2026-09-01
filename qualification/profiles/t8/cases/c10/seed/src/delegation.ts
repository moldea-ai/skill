import type { IDelegateSupportInput, ISupportOutput } from './contracts.js';
import { stepSupportAgent } from './step-support-agent.js';

/** Delegates one prompt without establishing a canonical handoff relationship. */
export const delegateSupport = async ({
  prompt,
}: IDelegateSupportInput): Promise<ISupportOutput> => {
  await stepSupportAgent.invoke(
    { messages: [{ role: 'user', content: prompt }], requestId: 'delegated-support' },
    { context: { accountId: 'delegated-support' } },
  );

  return { answer: 'The delegated support agent completed the request.' };
};
