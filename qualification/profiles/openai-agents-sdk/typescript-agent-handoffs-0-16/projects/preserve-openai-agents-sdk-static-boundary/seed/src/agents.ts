import { readFile } from 'node:fs/promises';

import { Agent, handoff, webSearchTool } from '@openai/agents';
import { RealtimeAgent } from '@openai/agents-realtime';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

const summaryAgent = new Agent({
  name: 'summary',
  instructions: 'Summarize support requests.',
  handoffDescription: 'Route requests that need a concise support summary here.',
});

const dynamicRoutingDescription = ['Route requests', 'that need a summary.'].join(' ');
const configuredSummaryHandoff = handoff(summaryAgent, {
  toolDescriptionOverride: dynamicRoutingDescription,
});
const delegatedSummaryTool = summaryAgent.asTool({
  toolName: 'summarize_request',
  toolDescription: 'Summarizes a support request while the manager retains control.',
});
const hostedWebSearchTool = webSearchTool();

export const supportAgent = new Agent({
  name: 'support',
  instructions: loadSupportInstruction,
  tools: [delegatedSummaryTool, hostedWebSearchTool],
  handoffs: [configuredSummaryHandoff],
});

const dynamicSupportConfiguration = {
  name: 'dynamic-support',
  instructions: 'Answer dynamic support requests.',
};

export const dynamicSupportAgent = new Agent(dynamicSupportConfiguration);

export const realtimeSupportAgent = new RealtimeAgent({
  name: 'realtime-support',
  instructions: 'Answer live support questions.',
});
