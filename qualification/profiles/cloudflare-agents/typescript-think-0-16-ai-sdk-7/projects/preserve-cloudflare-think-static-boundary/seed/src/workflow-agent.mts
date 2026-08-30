import { Think } from '@cloudflare/think';

/** Negative control with an executable field outside the closed class boundary. */
export class RuntimeInitializedAgent extends Think {
  public readonly initializedAt = Date.now();
}
