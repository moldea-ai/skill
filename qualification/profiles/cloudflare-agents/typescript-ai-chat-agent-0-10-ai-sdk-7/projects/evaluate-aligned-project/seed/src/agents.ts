import { AIChatAgent } from '@cloudflare/ai-chat';
import { Output, streamText } from 'ai';

import { SummaryOutputSchema } from './contracts.js';
import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool, summaryHandoffTool } from './tools.js';

/** Answers support requests with registered order and summary capabilities. */
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
      tools: { find_order: findOrderTool, summarize: summaryHandoffTool },
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}

/** Produces concise support-request summaries. */
export class SummaryAgent extends AIChatAgent {
  public override onChatMessage(
    onFinish: Parameters<AIChatAgent['onChatMessage']>[0],
    options?: Parameters<AIChatAgent['onChatMessage']>[1],
  ): Promise<Response> {
    void onFinish;
    void options;

    const result = streamText({
      model: 'openai/gpt-5',
      prompt: 'Summarize the latest support request.',
      instructions: loadSummaryInstruction(),
      output: Output.object({ schema: SummaryOutputSchema }),
    });

    return Promise.resolve(result.toUIMessageStreamResponse());
  }
}
