import { Think } from '@cloudflare/think';

export const loadSupportInstruction = (): string =>
  'Answer support requests from verified evidence.';

/** Renamed support agent whose direct static relationships remain provable. */
export class SupportAssistant extends Think {
  public override getSystemPrompt(): string {
    return loadSupportInstruction();
  }
}
