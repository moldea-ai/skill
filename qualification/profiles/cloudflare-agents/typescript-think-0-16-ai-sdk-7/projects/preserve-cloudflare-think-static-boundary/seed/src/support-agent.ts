import { Think } from '@cloudflare/think';
import type { ToolSet } from 'ai';

import { loadSupportInstruction } from './instructions.js';
import { supportStatusTool } from './status-tools.js';

const createRuntimeTools = (): ToolSet => ({});

/** Keeps identity static while its final tool map remains runtime-dependent. */
export class SupportAgent extends Think {
  public override getSystemPrompt(): string {
    return loadSupportInstruction();
  }

  public override getTools() {
    return { status: supportStatusTool, ...createRuntimeTools() };
  }
}
