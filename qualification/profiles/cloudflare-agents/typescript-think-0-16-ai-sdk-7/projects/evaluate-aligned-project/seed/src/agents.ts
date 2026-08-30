import { Think } from '@cloudflare/think';

import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool, summaryHandoffTool } from './tools.js';

/** Answers support requests with registered order and summary capabilities. */
export class SupportAgent extends Think {
  public override getSystemPrompt(): string {
    return loadSupportInstruction();
  }

  public override getTools() {
    return { find_order: findOrderTool, summarize: summaryHandoffTool };
  }
}

/** Produces concise support-request summaries. */
export class SummaryAgent extends Think {
  public override getSystemPrompt(): string {
    return loadSummaryInstruction();
  }
}
