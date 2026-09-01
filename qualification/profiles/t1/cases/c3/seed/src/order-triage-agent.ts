import { readFile } from 'node:fs/promises';

import Anthropic from '@anthropic-ai/sdk';

export const ClassifyOrderInputSchema = {
  additionalProperties: false,
  properties: { orderId: { type: 'string' } },
  required: ['orderId'],
  type: 'object' as const,
};

export const loadOrderTriageInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/order-triage/instruction.md', import.meta.url), 'utf8');

export const classifyOrder = ({ orderId }: { orderId: string }) =>
  Promise.resolve({
    category: orderId.startsWith('R-') ? ('refund-review' as const) : ('fulfillment' as const),
  });

export const classifyOrderTool = {
  name: 'classify_order',
  description: 'Classifies an order for human review.',
  input_schema: ClassifyOrderInputSchema,
} as const;

const client = new Anthropic();

export const orderTriageAgent = async (prompt: string) =>
  client.messages.create({
    max_tokens: 256,
    messages: [{ content: prompt, role: 'user' }],
    model: 'claude-sonnet-4-20250514',
    system: await loadOrderTriageInstruction(),
    tools: [classifyOrderTool],
  });
