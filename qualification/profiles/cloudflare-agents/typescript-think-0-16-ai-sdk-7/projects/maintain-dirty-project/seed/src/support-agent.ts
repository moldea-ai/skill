import { Think } from '@cloudflare/think';

export const loadSupportInstruction = (): string =>
  'Answer support requests from verified evidence and use billing context for disputes.';

/** Answers support requests using the canonical instruction. */
export class SupportAgent extends Think {
  public override getSystemPrompt(): string {
    return loadSupportInstruction();
  }
}
