import { readFileSync } from 'node:fs';

export const loadSupportInstruction = (): string =>
  readFileSync(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

export const loadSummaryInstruction = (): string =>
  readFileSync(new URL('../moldea/agents/summary/instruction.md', import.meta.url), 'utf8');

export const loadBillingInstruction = (): string =>
  readFileSync(new URL('../moldea/agents/billing/instruction.md', import.meta.url), 'utf8');

export const loadOrdersInstruction = (): string =>
  readFileSync(new URL('../moldea/agents/orders/instruction.md', import.meta.url), 'utf8');
