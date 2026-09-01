import { AIChatAgent } from '@cloudflare/ai-chat';
import { Output, streamText } from 'ai';

import { SupportOutputSchema } from './contracts.js';
import { lookupOrderTool } from './tools.js';

export const loadSupportInstruction = (): string =>
  'Answer support requests from verified order evidence.';

/** Answers support requests with structured output and a closed order lookup tool map. */
export class SupportAgent extends AIChatAgent {
  public override onChatMessage(
    onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    options?: Parameters<AIChatAgent['onChatMessage']>[1],
  ): Promise<Response> {
    void onFinish;
    void options;

    const result = streamText({
      model: 'openai/gpt-5',
      prompt: 'Answer the latest support request.',
      instructions: loadSupportInstruction(),
      output: Output.object({ schema: SupportOutputSchema }),
      tools: { lookup_order: lookupOrderTool },
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
