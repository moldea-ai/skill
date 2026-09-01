import { AIChatAgent } from '@cloudflare/ai-chat';
import { streamText } from 'ai';

import { loadStepSupportInstruction } from './instructions.js';

/** Keeps prepareStep-controlled instructions outside the static loader boundary. */
export class StepSupportAgent extends AIChatAgent {
  public override onChatMessage(
    onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    options?: Parameters<AIChatAgent['onChatMessage']>[1],
  ): Promise<Response> {
    void onFinish;
    void options;

    const result = streamText({
      model: 'openai/gpt-5',
      prompt: 'Resolve one focused support step.',
      instructions: loadStepSupportInstruction(),
      prepareStep: () => ({ instructions: loadStepSupportInstruction() }),
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
