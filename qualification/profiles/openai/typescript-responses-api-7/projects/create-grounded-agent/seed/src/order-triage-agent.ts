import { readFile } from 'node:fs/promises';

import OpenAI from 'openai';

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
  type: 'function',
  name: 'classify_order',
  description: 'Classifies an order for human review.',
  parameters: ClassifyOrderInputSchema,
  strict: true,
} as const;

const client = new OpenAI();

export const orderTriageAgent = async (prompt: string) =>
  client.responses.create({
    input: prompt,
    model: 'gpt-5',
    instructions: await loadOrderTriageInstruction(),
    tools: [classifyOrderTool],
  });
