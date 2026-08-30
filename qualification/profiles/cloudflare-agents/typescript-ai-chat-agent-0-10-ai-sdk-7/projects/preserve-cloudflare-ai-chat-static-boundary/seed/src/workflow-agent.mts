import { AIChatAgent } from '@cloudflare/ai-chat';

/** Negative control with an executable field outside the closed class boundary. */
export class RuntimeInitializedAgent extends AIChatAgent {
  public readonly initializedAt = Date.now();
}
