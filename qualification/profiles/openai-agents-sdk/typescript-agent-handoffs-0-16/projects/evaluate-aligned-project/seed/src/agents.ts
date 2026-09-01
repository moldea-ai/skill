import { Agent, handoff } from '@openai/agents';

import { SupportOutputSchema } from './contracts.js';
import { loadSummaryInstruction, loadSupportInstruction } from './instructions.js';
import { findOrderTool } from './tools.js';

export const summaryAgent = new Agent({
  name: 'summary',
  instructions: loadSummaryInstruction,
  handoffDescription: 'Route requests that need a concise support summary here.',
});

const configuredSummaryHandoff = handoff(summaryAgent, {
  toolNameOverride: 'route_summary',
  toolDescriptionOverride: 'Route requests that need a concise support summary here.',
});

export const supportAgent = Agent.create({
  name: 'support',
  instructions: loadSupportInstruction,
  outputType: SupportOutputSchema,
  tools: [findOrderTool],
  handoffs: [summaryAgent, configuredSummaryHandoff],
});
