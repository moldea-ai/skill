import { readFileSync } from 'node:fs';

export const loadInstruction = () =>
  readFileSync(
    new URL('../../moldea/agents/support-agent/instruction.md', import.meta.url),
    'utf8',
  );
