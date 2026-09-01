import { AIChatAgent } from '@cloudflare/ai-chat';
import { streamText } from 'ai';

export const loadSupportInstruction = (): string =>
  'Answer support requests from verified evidence and use billing context for disputes.';

/** Answers support requests using the canonical instruction. */
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
