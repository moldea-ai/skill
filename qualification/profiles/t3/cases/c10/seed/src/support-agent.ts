import { AIChatAgent } from '@cloudflare/ai-chat';
import { streamText, type ToolSet } from 'ai';

import { loadSupportInstruction } from './instructions.js';
import { supportStatusTool } from './status-tools.js';

const createRuntimeTools = (): ToolSet => ({});

/** Keeps identity and instructions static while its final tool map remains runtime-dependent. */
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
      tools: { status: supportStatusTool, ...createRuntimeTools() },
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
