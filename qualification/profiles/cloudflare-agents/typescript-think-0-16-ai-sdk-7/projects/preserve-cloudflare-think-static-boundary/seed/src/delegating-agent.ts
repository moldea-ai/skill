import { Think } from '@cloudflare/think';

import { delegateSupportTool } from './delegation-tool.js';
import { loadDelegatingSupportInstruction } from './instructions.js';

/** Registers an ordinary function tool without declaring an agent handoff. */
export class DelegatingSupportAgent extends Think {
  public override getSystemPrompt(): string {
    return loadDelegatingSupportInstruction();
  }

  public override getTools() {
    return { delegate_support: delegateSupportTool };
  }
}
