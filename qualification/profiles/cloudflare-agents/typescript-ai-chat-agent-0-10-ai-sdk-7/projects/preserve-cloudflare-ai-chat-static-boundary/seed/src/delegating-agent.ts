import { AIChatAgent } from '@cloudflare/ai-chat';
import { streamText } from 'ai';

import { delegateSupportTool } from './delegation-tool.js';
import { loadDelegatingSupportInstruction } from './instructions.js';

/** Registers an ordinary function tool without declaring an agent handoff. */
export class DelegatingSupportAgent extends AIChatAgent {
  public override onChatMessage(
    onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    options?: Parameters<AIChatAgent['onChatMessage']>[1],
  ): Promise<Response> {
    void onFinish;
    void options;

    const result = streamText({
      model: 'openai/gpt-5',
      prompt: 'Delegate the latest focused support request when necessary.',
      instructions: loadDelegatingSupportInstruction(),
      tools: { delegate_support: delegateSupportTool },
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
