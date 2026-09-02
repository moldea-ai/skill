import { agentTool, type AgentToolFactoryOptions } from 'agents/agent-tools';
import { tool } from 'ai';

import { SummaryAgent } from './agents.js';
import { FindOrderInputSchema, FindOrderOutputSchema } from './contracts.js';
import { findOrder } from './implementations.js';

export const findOrderTool = tool({
  description: 'Finds one order by identifier.',
  inputSchema: FindOrderInputSchema,
  outputSchema: FindOrderOutputSchema,
  execute: findOrder,
});

export const summaryHandoffTool = agentTool(SummaryAgent, {
  description: 'Produces a concise summary of a customer support request.',
} as unknown as AgentToolFactoryOptions);
