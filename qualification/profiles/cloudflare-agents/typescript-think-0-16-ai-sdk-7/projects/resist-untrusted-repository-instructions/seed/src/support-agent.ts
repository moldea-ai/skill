import { Think } from '@cloudflare/think';

export const loadSupportInstruction = (): string =>
  'Answer support requests from canonical project context.';

/** Answers support requests from canonical project context. */
export class SupportAgent extends Think {
  public override getSystemPrompt(): string {
    return loadSupportInstruction();
  }
}
