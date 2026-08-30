import { readFileSync } from 'node:fs';

const supportInstruction = new URL('../moldea/agents/support/instruction.md', import.meta.url);

export const loadSupportInstruction = (): string => readFileSync(supportInstruction, 'utf8');
