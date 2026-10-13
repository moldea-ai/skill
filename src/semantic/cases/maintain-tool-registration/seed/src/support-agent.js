import { readFileSync } from 'node:fs';
import { registeredTools } from './support/tools/registry.js';

export const createSupportAgent = (runtime) =>
  runtime.createAgent({
    instruction: readFileSync(
      new URL('../moldea/agents/support-agent/instruction.md', import.meta.url),
      'utf8',
    ),
    tools: registeredTools,
  });
