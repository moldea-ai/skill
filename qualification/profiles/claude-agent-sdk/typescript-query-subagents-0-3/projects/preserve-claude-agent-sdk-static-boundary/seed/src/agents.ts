import { readFile } from 'node:fs/promises';

import {
  createSdkMcpServer,
  query,
  tool,
  type AgentDefinition,
  type McpServerConfig,
  type Options,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

export const loadSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/support/instruction.md', import.meta.url), 'utf8');

export const loadDynamicSupportInstruction = async (): Promise<string> =>
  readFile(new URL('../moldea/agents/dynamic-support/instruction.md', import.meta.url), 'utf8');

const externalServer = {
  args: ['./external-server.mjs'],
  command: 'node',
  type: 'stdio',
} satisfies McpServerConfig;

const BoundaryInputSchema = {
  requestId: z.string(),
};

const inspectBoundary = ({ requestId }: { requestId: string }) =>
  Promise.resolve({
    content: [{ text: JSON.stringify({ requestId }), type: 'text' as const }],
  });

export const boundaryTool = tool(
  'inspect_boundary',
  'Inspects one boundary request.',
  BoundaryInputSchema,
  inspectBoundary,
);

const boundaryServer = createSdkMcpServer({
  instructions: 'Additional server-facing guidance outside canonical agent instructions.',
  name: 'boundary-tools',
  tools: [boundaryTool],
  version: '1.0.0',
});

const loadDynamicToolRestrictions = (): string[] => ['Agent(team:billing)', 'mcp__boundary__*'];

const buildDynamicRoutingDescription = (): string =>
  ['Route', 'dynamic', 'billing', 'questions'].join(' ');

const createDynamicBillingAgent = (): AgentDefinition => ({
  criticalSystemReminder_EXPERIMENTAL: 'Inspect the request before answering.',
  description: buildDynamicRoutingDescription(),
  disallowedTools: loadDynamicToolRestrictions(),
  mcpServers: [{ external: externalServer }],
  observer: 'audit-observer',
  observerMessage: 'Observe billing decisions.',
  prompt: 'Resolve dynamic billing questions.',
  skills: ['billing-context'],
});

const buildDynamicOptions = async (): Promise<Options> => ({
  agent: 'billing',
  agents: { billing: createDynamicBillingAgent() },
  disallowedTools: loadDynamicToolRestrictions(),
  mcpServers: {
    'external/support': externalServer,
  },
  systemPrompt: [await loadDynamicSupportInstruction()],
  toolAliases: { FindOrder: 'mcp__boundary__find_order' },
  tools: { preset: 'claude_code', type: 'preset' },
});

export const supportAgent = async (prompt: string) =>
  query({
    prompt,
    options: {
      mcpServers: {
        'boundary/tools': boundaryServer,
      },
      systemPrompt: await loadSupportInstruction(),
    },
  });

export const dynamicSupportAgent = async (prompt: string) =>
  query({ prompt, options: await buildDynamicOptions() });
