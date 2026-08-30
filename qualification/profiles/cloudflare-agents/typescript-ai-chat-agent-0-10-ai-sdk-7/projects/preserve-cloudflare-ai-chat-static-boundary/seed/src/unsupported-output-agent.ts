import { AIChatAgent } from '@cloudflare/ai-chat';
import { Output, streamText } from 'ai';
import { z } from 'zod';

/** Negative control whose array output is outside the supported agent-schema relationship. */
export class UnsupportedOutputAgent extends AIChatAgent {
  public override onChatMessage(
    onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    options?: Parameters<AIChatAgent['onChatMessage']>[1],
  ): Promise<Response> {
    void onFinish;
    void options;

    const result = streamText({
      model: 'openai/gpt-5',
      prompt: 'List support categories.',
      output: Output.array({ element: z.object({ category: z.string() }) }),
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
