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
        inputSchema:
          path: /src/contracts.ts
          symbol: LookupOrderInput
    affectedBy:
      - /src/refund-policy.ts
      - /src/refund-policy.test-unit.ts
      - /moldea/context/refund-policy.md
`;

const createPolicy = (refundWindowDays: number): string => `# Refund policy

Customers may request a refund within ${refundWindowDays} completed days of purchase.
The application decides eligibility. The support agent explains the decision and looks up the order when needed.
`;

const createInstruction = (refundWindowDays: number): string => `You are the \`support\` agent.

Explain that refunds are available within ${refundWindowDays} completed days of purchase.
Use the order lookup for current order details. Do not invent order status or eligibility.
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
  '/moldea/agents/support/description.md':
    'Helps customers understand refund eligibility and current order status.\n',
  '/moldea/agents/support/instruction.md': createInstruction(refundWindowDays),
  '/moldea/context/refund-policy.md': createPolicy(refundWindowDays),
  '/moldea/moldea.yaml': createManifest(),
  '/moldea/project.md':
    '# Acme Store\n\nThe application owns refund eligibility. The support agent explains it.\n',
  '/package.json': `${JSON.stringify(
    {
      dependencies: { openai: '^7.4.0' },
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

import { loadSupportInstruction } from './instructions.js';
import { lookupOrderTool } from './order-lookup.js';

const client = new OpenAI();

export const supportAgent = async (prompt: string) =>
  client.responses.create({
    input: prompt,
    model: '${LANDING_EXAMPLE.model}',
    instructions: loadSupportInstruction(),
    tools: [lookupOrderTool],
  });
`,
  '/src/contracts.ts': `export const LookupOrderInput = {
  additionalProperties: false,
  properties: { orderId: { type: 'string' } },
  required: ['orderId'],
  type: 'object',
} as const;
`,
  '/src/instructions.ts': `import { readFileSync } from 'node:fs';

/** Reads the canonical support instruction. */
export const loadSupportInstruction = (): string =>
  readFileSync(
    new URL('../moldea/agents/support/instruction.md', import.meta.url),
    'utf8',
  );
`,
  '/src/order-lookup.ts': `import { LookupOrderInput } from './contracts.js';

/** Looks up an order in the example catalog. */
export const lookupOrder = async (orderId: string) => ({
  orderId,
  status: orderId === 'order-1042' ? 'shipped' : 'not_found',
});

export const lookupOrderTool = {
  type: 'function',
  name: 'lookup_order',
  description: 'Looks up one order by identifier.',
  parameters: LookupOrderInput,
  strict: true,
} as const;
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
  '/src/agent.ts': LANDING_EXAMPLE_MAINTAINED_FILES['/src/agent.ts']!.replace(
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
