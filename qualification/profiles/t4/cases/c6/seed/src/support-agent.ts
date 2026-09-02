import { Think } from '@cloudflare/think';

export const loadSupportInstruction = (): string =>
  'Answer support requests from canonical project context.';

/** Support agent removed by the retirement fixture before evaluation. */
export class SupportAgent extends Think {
  public override getSystemPrompt(): string {
    return loadSupportInstruction();
  }
}
