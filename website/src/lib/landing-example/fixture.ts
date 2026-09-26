// complete source snapshots behind the landing-page illustration
export type ILandingExampleFiles = Readonly<Record<string, string>>;

// stable facts shared by the fixture, its checks, and every rendered landing example
export const LANDING_EXAMPLE = {
  diagnostic: 'OPENAI_INSTRUCTION_LOADER_NOT_WIRED',
  initialRefundWindowDays: 30,
  maintainedRefundWindowDays: 14,
  maintenanceRequest: "Shorten the application's refund window from 30 days to 14",
  model: 'gpt-6-astra',
  paths: {
    agent: '/src/agent.ts',
    agentDescription: '/moldea/agents/support/description.md',
    contracts: '/src/contracts.ts',
    instruction: '/moldea/agents/support/instruction.md',
    instructionLoader: '/src/instructions.ts',
    manifest: '/moldea/moldea.yaml',
    orderLookup: '/src/order-lookup.ts',
    policyContext: '/moldea/context/refund-policy.md',
    project: '/moldea/project.md',
    refundPolicy: '/src/refund-policy.ts',
    refundPolicyTest: '/src/refund-policy.test-unit.ts',
  },
  request: 'Create a support agent using our refund policy and existing order lookup.',
} as const;

const createManifest = (): string => `version: 1
agents:
  support:
    runtime:
      id: openai
    context:
      - /moldea/context/refund-policy.md
    bindings:
      runtimeAgent:
        path: /src/agent.ts
        symbol: supportAgent
      instructionLoader:
        path: /src/instructions.ts
        symbol: loadSupportInstruction
    tools:
      lookup-order:
        name: lookup_order
        description: Looks up one order by identifier.
        implementation:
          path: /src/order-lookup.ts
          symbol: lookupOrder
        registration:
          path: /src/order-lookup.ts
          symbol: lookupOrderTool
    affectedBy:
      - /src/contracts.ts
      - /src/refund-policy.ts
      - /moldea/context/refund-policy.md
`;

// source segments keep the modified files and their illustrated edits in sync
type ILandingExampleEdit = { kind: 'context' | 'added' | 'removed'; source: string };
const LANDING_EXAMPLE_AGENT_EDITS: Readonly<Record<string, readonly ILandingExampleEdit[]>> = {
  '/moldea/moldea.yaml': [
    { kind: 'context', source: 'version: 1\n' },
    { kind: 'removed', source: 'agents: {}\n' },
    { kind: 'added', source: createManifest().slice('version: 1\n'.length) },
  ],
  '/src/order-lookup.ts': [
    {
      kind: 'context',
      source: `export const lookupOrder = async (orderId: string) => ({
  orderId,
  status: orderId === 'order-1042' ? 'shipped' : 'not_found',
});
`,
    },
    {
      kind: 'added',
      source: `
export const lookupOrderTool = {
  type: 'function',
  name: 'lookup_order',
  description: 'Looks up one order by identifier.',
  parameters: {
    additionalProperties: false,
    properties: { orderId: { type: 'string' } },
    required: ['orderId'],
    type: 'object',
  },
  strict: true,
} as const;
`,
    },
  ],
};

const modifiedAgentFiles: ILandingExampleFiles = Object.fromEntries(
  Object.entries(LANDING_EXAMPLE_AGENT_EDITS).map(([path, edits]) => [
    path,
    edits
      .filter(({ kind }) => kind !== 'removed')
      .map(({ source }) => source)
      .join(''),
  ]),
);

const createPolicy = (refundWindowDays: number): string => `# Refund policy

Customers may request a refund within ${refundWindowDays} completed days of purchase.
The application decides eligibility. The support agent explains the decision and looks up the order when needed.
`;

const projectSource = `# Trailside

Trailside sells hiking and camping gear online. Customers contact support about deliveries and returns.

The TypeScript backend owns order status and refund eligibility. The return rules live in \`context/refund-policy.md\`.

Support can explain the policy and look up orders. It cannot approve refunds or change orders.
`;

// existing hero files before agent creation; project context and policy are reused unchanged
export const LANDING_EXAMPLE_BEFORE_AGENT_FILES: ILandingExampleFiles = {
  ...Object.fromEntries(
    Object.entries(LANDING_EXAMPLE_AGENT_EDITS).map(([path, edits]) => [
      path,
      edits
        .filter(({ kind }) => kind !== 'added')
        .map(({ source }) => source)
        .join(''),
    ]),
  ),
  [LANDING_EXAMPLE.paths.project]: projectSource,
  [LANDING_EXAMPLE.paths.policyContext]: createPolicy(LANDING_EXAMPLE.initialRefundWindowDays),
};

const createInstruction = (
  refundWindowDays: number,
): string => `You are the \`support\` agent for Trailside.

Explain that customers may request a refund within ${refundWindowDays} completed days; the application decides eligibility.
Use the order lookup for current order details. Do not invent order status or eligibility.
Do not approve refunds or change orders.
`;

const createRefundPolicySource = (
  refundWindowDays: number,
): string => `/** Returns whether a completed-day age is inside the inclusive refund window. */
export const isRefundEligible = (completedDays: number): boolean => {
  if (!Number.isInteger(completedDays) || completedDays < 0) return false;

  return completedDays <= ${refundWindowDays};
};
`;

const createRefundPolicyTest = (
  refundWindowDays: number,
): string => `import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isRefundEligible } from './refund-policy.ts';

test('keeps the refund window inclusive', () => {
  assert.equal(isRefundEligible(0), true);
  assert.equal(isRefundEligible(${refundWindowDays}), true);
  assert.equal(isRefundEligible(${refundWindowDays + 1}), false);
});

test('rejects invalid completed-day ages', () => {
  assert.equal(isRefundEligible(-1), false);
  assert.equal(isRefundEligible(1.5), false);
  assert.equal(isRefundEligible(Number.POSITIVE_INFINITY), false);
});
`;

const createCommonFiles = (refundWindowDays: number): ILandingExampleFiles => ({
  ...modifiedAgentFiles,
  '/moldea/agents/support/description.md':
    'Helps Trailside customers track outdoor gear orders and understand the return policy.\n',
  '/moldea/agents/support/instruction.md': createInstruction(refundWindowDays),
  '/moldea/context/refund-policy.md': createPolicy(refundWindowDays),
  '/moldea/project.md': projectSource,
  '/package.json': `${JSON.stringify(
    {
      dependencies: { openai: '^7.4.0', zod: '4.3.6' },
      name: 'moldea-landing-example',
      private: true,
      scripts: {
        test: 'npm run test:unit',
        'test:unit': 'node --experimental-strip-types --test src/refund-policy.test-unit.ts',
      },
      type: 'module',
    },
    null,
    2,
  )}\n`,
  '/src/agent.ts': `import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

import { SupportInput, SupportOutput } from './contracts.js';
import { loadSupportInstruction } from './instructions.js';
import { lookupOrder, lookupOrderTool } from './order-lookup.js';

const client = new OpenAI();

export const supportAgent = async (input: unknown) => {
  const response = await client.responses.create({
    input: JSON.stringify(SupportInput.parse(input)),
    model: '${LANDING_EXAMPLE.model}',
    instructions: loadSupportInstruction(),
    tools: [lookupOrderTool],
    text: { format: zodTextFormat(SupportOutput, 'support') },
    parallel_tool_calls: false,
  });

  const toolCall = response.output.find((item) => item.type === 'function_call');
  if (!toolCall) return response;
  if (toolCall.name !== lookupOrderTool.name) throw new Error('Unexpected support tool call.');

  const { orderId } = z.strictObject({ orderId: z.string() }).parse(
    JSON.parse(toolCall.arguments) as unknown,
  );
  const order = await lookupOrder(orderId);

  return client.responses.create({
    input: [{ type: 'function_call_output', call_id: toolCall.call_id, output: JSON.stringify(order) }],
    model: '${LANDING_EXAMPLE.model}',
    previous_response_id: response.id,
    instructions: loadSupportInstruction(),
    tools: [lookupOrderTool],
    tool_choice: 'none',
    text: { format: zodTextFormat(SupportOutput, 'support') },
  });
};
`,
  '/src/contracts.ts': `import { z } from 'zod';

// validated input and structured output for the support agent
export const SupportInput = z.strictObject({
  message: z.string().trim().min(1),
  orderId: z.string().min(1).nullable(),
});

export const SupportOutput = z.strictObject({
  reply: z.string(),
});

export type ISupportInput = z.infer<typeof SupportInput>;
export type ISupportOutput = z.infer<typeof SupportOutput>;
`,
  '/src/instructions.ts': `import { readFileSync } from 'node:fs';

/** Reads the canonical support instruction. */
export const loadSupportInstruction = (): string =>
  readFileSync(
    new URL('../moldea/agents/support/instruction.md', import.meta.url),
    'utf8',
  );
`,
  '/src/refund-policy.test-unit.ts': createRefundPolicyTest(refundWindowDays),
  '/src/refund-policy.ts': createRefundPolicySource(refundWindowDays),
});

// initial 30-day project shown in the hero
export const LANDING_EXAMPLE_INITIAL_FILES = createCommonFiles(
  LANDING_EXAMPLE.initialRefundWindowDays,
);

// maintained 14-day project shown after the application change
export const LANDING_EXAMPLE_MAINTAINED_FILES = createCommonFiles(
  LANDING_EXAMPLE.maintainedRefundWindowDays,
);

// supported defect where saved instructions exist but the runtime call bypasses their loader
export const LANDING_EXAMPLE_DISCONNECTED_FILES: ILandingExampleFiles = {
  ...LANDING_EXAMPLE_MAINTAINED_FILES,
  '/src/agent.ts': LANDING_EXAMPLE_MAINTAINED_FILES['/src/agent.ts']!.replaceAll(
    'instructions: loadSupportInstruction()',
    "instructions: 'Be helpful.'",
  ),
};

/** Returns one required source body from a landing example snapshot. */
export const getLandingExampleFile = (files: ILandingExampleFiles, path: string): string => {
  const source = files[path];
  if (source === undefined) throw new Error(`Landing example file is missing: ${path}`);

  return source;
};

/** Returns one required trimmed source line from a landing example snapshot. */
export const getLandingExampleLine = (
  files: ILandingExampleFiles,
  path: string,
  fragment: string,
): string => {
  const line = getLandingExampleFile(files, path)
    .split('\n')
    .find((candidate) => candidate.includes(fragment));
  if (line === undefined) throw new Error(`Landing example line is missing: ${fragment}`);

  return line.trim();
};
