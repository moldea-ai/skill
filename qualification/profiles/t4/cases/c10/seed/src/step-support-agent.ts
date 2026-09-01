import { Think, type Session } from '@cloudflare/think';

import { loadStepSupportInstruction } from './instructions.js';

const configureSupportSession = (session: Session): Session =>
  session.withContext('step-support', {
    provider: { get: () => Promise.resolve(loadStepSupportInstruction()) },
  });

/** Uses a helper-built session whose instruction relationship is intentionally dynamic. */
export class StepSupportAgent extends Think {
  public override configureSession(session: Session): Session {
    return configureSupportSession(session);
  }
}
