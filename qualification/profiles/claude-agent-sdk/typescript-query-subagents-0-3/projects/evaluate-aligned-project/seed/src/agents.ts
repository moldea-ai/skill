import { query, type AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

import { SupportOutputSchema } from './contracts.js';
import {
  loadBillingInstruction,
  loadOrdersInstruction,
  loadSummaryInstruction,
  loadSupportInstruction,
} from './instructions.js';
import { supportServer } from './tools.js';

export const billingAgent = {
  description: 'Route billing questions and payment issues here.',
  prompt: loadBillingInstruction(),
  tools: ['mcp__support__find_order'],
} satisfies AgentDefinition;

export const ordersAgent = {
  description: 'Route order-status and fulfillment questions here.',
  prompt: loadOrdersInstruction(),
} satisfies AgentDefinition;

export const supportAgent = (prompt: string) =>
  query({
    prompt,
    options: {
      agents: { billing: billingAgent, orders: ordersAgent },
      mcpServers: { support: supportServer },
      outputFormat: { schema: SupportOutputSchema, type: 'json_schema' },
      systemPrompt: loadSupportInstruction(),
      tools: ['Agent', 'mcp__support__find_order'],
    },
  });

export const summaryAgent = (prompt: string) =>
  query({
    prompt,
    options: {
      systemPrompt: {
        append: loadSummaryInstruction(),
        preset: 'claude_code',
        type: 'preset',
      },
    },
  });
