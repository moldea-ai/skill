import { AIChatAgent } from '@cloudflare/ai-chat';
import { streamText } from 'ai';

export const loadSupportInstruction = (): string =>
  'Answer support requests from canonical project context.';

/** Support agent removed by the retirement fixture before evaluation. */
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
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
