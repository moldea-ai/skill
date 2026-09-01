import { createAgent, providerStrategy, SystemMessage, toolStrategy } from 'langchain';

import { SummaryOutputSchema, SupportOutputSchema } from './contracts.js';
import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool } from './tools.js';

const SUPPORT_TOOLS = [findOrderTool];

export const supportAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'support-runtime',
  systemPrompt: new SystemMessage(await loadSupportInstruction()),
  responseFormat: providerStrategy(SupportOutputSchema),
  tools: SUPPORT_TOOLS,
});

export const summaryAgent = createAgent({
  model: 'openai:gpt-4o',
  name: 'summary-runtime',
  systemPrompt: await loadSummaryInstruction(),
  responseFormat: toolStrategy(SummaryOutputSchema),
});
