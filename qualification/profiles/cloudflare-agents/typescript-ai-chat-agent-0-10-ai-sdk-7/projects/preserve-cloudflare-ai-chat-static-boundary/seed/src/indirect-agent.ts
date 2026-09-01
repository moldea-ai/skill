import { AIChatAgent } from '@cloudflare/ai-chat';
import { streamText } from 'ai';

const createIndirectResponse = (): Response =>
  streamText({
    model: 'openai/gpt-5',
    prompt: 'Answer indirectly.',
  }).toUIMessageStreamResponse();

/** Negative control whose generation call is outside onChatMessage. */
export class IndirectSupportAgent extends AIChatAgent {
  public override onChatMessage(
    onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    options?: Parameters<AIChatAgent['onChatMessage']>[1],
  ): Promise<Response> {
    void onFinish;
    void options;
    return Promise.resolve(createIndirectResponse());
  }
}
