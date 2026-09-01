import { AIChatAgent } from '@cloudflare/ai-chat';
import { streamText } from 'ai';

import { assembleTools } from './dynamic-tools.js';

export const loadSupportInstruction = (): string =>
  'Answer support requests from verified evidence.';

/** Renamed support agent whose instruction remains direct while tools are runtime-selected. */
export class SupportAssistant extends AIChatAgent {
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
      tools: assembleTools([]),
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
