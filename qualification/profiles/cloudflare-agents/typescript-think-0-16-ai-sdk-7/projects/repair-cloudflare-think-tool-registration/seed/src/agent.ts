import { Think } from '@cloudflare/think';

import { lookupOrderTool } from './tools.js';

export const loadSupportInstruction = (): string =>
  'Answer support requests from verified order evidence.';

/** Answers support requests with a closed order lookup tool map. */
export class SupportAgent extends Think {
  public override getSystemPrompt(): string {
    return loadSupportInstruction();
  }

  public override getTools() {
    return { lookup_order: lookupOrderTool };
  }
}
