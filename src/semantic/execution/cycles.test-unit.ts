// @vitest-environment node
import { expect, test } from 'vitest';

import type { ISemanticCase } from '../cases/index.ts';
import { hasValidSemanticCycles, summarizeSemanticCycles } from './cycles.ts';
import { parseSemanticEvaluationHostOutput } from './host-output.ts';
import { createSemanticResultDimensions } from './outcomes.ts';
import type { ISemanticCycleEvidence } from './types.ts';

const createCycle = (
  requestIndex: number,
  callCount = 4,
  outputByteCount = 50_000,
  ordinaryCommandCount = 0,
): ISemanticCycleEvidence => {
  const output = [
    ...Array.from({ length: ordinaryCommandCount }, () => ({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command: 'cat moldea/project.md',
        aggregated_output: '',
        exit_code: 0,
        status: 'completed',
      },
    })),
    ...Array.from({ length: callCount }, () => ({
      type: 'item.completed',
      item: {
        type: 'command_execution',
        command:
          '/opt/node /mnt/.agents/skills/moldea/scripts/moldea-cli.mjs --repository /mnt -- content --path moldea/project.md --json --max-output-bytes 65536',
        aggregated_output: 'x'.repeat(outputByteCount),
        exit_code: 0,
        status: 'completed',
      },
    })),
    {
      type: 'item.completed',
      item: {
        type: 'agent_message',
        text: requestIndex === 0 ? 'I started a new budget myself.' : 'Complete.',
      },
    },
    {
      type: 'turn.completed',
      usage: { input_tokens: 1_000_000, cached_input_tokens: 800_000, output_tokens: 100 },
    },
    {
      type: 'moldea.git-invocations',
      evidence: {
        invocationCount: 0,
        hostInvocationCount: 0,
        repair: { compliantCount: 0, noncompliantCount: 0, unverifiedCount: 0, reasons: [] },
      },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join('\n');
  return {
    ...parseSemanticEvaluationHostOutput(output, { cliVersion: '11.0.6', jsonSchemaVersion: 7 }),
    developerRequest: requestIndex === 1 ? 'continue' : `Request ${requestIndex + 1}`,
    requestIndex,
    isMountIntegrityPassing: true,
    isRepositoryControlPassing: true,
    workspaceChanges: { created: [], deleted: [], modified: [] },
  };
};

const caseDefinition: ISemanticCase = {
  id: 'cycle-test',
  scenario: 'Sequential maintenance',
  operation: 'maintain',
  coverageClaimIds: ['cycle-budget'],
  input: {
    developerDirection: 'Request 1',
    repositoryEvidence: [],
    followUpDeveloperRequests: ['continue', 'Request 3'],
  },
  expected: [{ label: 'complete', criterion: 'Complete the requests.' }],
  forbidden: [{ label: 'extension', criterion: 'Asks for a budget extension.' }],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 262_144,
  },
};

const dimensionsFor = (cycles: ISemanticCycleEvidence[]) => {
  const summary = summarizeSemanticCycles(cycles);
  return createSemanticResultDimensions({
    cycles,
    actorCommandPolicy: summary.commandPolicyEvidence,
    actorExecutionEvidence: summary.actorExecutionEvidence,
    actorResourceEvidence: summary.actorResourceEvidence,
    gitInvocationEvidence: summary.gitInvocationEvidence,
    judgeCommandPolicy: createCycle(0, 0).commandPolicyEvidence,
    caseDefinition,
    isMountIntegrityPassing: true,
    isRepositoryControlPassing: true,
    isSemanticPassing: true,
  });
};

test('validates invocation evidence before summing a session larger than one cycle', () => {
  const cycles = [createCycle(0), createCycle(1), createCycle(2)];
  expect(hasValidSemanticCycles(cycles, { cliVersion: '11.0.6', jsonSchemaVersion: 7 })).toBe(true);
  const summary = summarizeSemanticCycles(cycles);
  expect(summary.actorResourceEvidence.stdoutByteCount).toBe(600_000);
  expect(summary.usage).toStrictEqual({
    inputTokens: 3_000_000,
    cachedInputTokens: 2_400_000,
    outputTokens: 300,
  });
  expect(dimensionsFor(cycles)).toStrictEqual({
    semantic: true,
    resource: true,
    commandPolicy: true,
    repositoryControl: true,
    mountIntegrity: true,
    operational: true,
  });
  expect(cycles[0]?.actorResourceEvidence.commandCount).toBe(4);
});

test('an earlier exceeded cycle stays failed despite later requests and actor-authored reset claims', () => {
  const cycles = [createCycle(0, 6), createCycle(1, 0), createCycle(2, 0)];
  expect(cycles[0]?.response).toContain('new budget');
  expect(dimensionsFor(cycles).resource).toBe(false);
  cycles[0]!.isRepositoryControlPassing = false;
  expect(dimensionsFor(cycles).repositoryControl).toBe(false);
});

test('rejects missing, reordered and forged per-cycle evidence', () => {
  const options = { cliVersion: '11.0.6', jsonSchemaVersion: 7 };
  expect(hasValidSemanticCycles([], options)).toBe(false);
  expect(hasValidSemanticCycles([createCycle(1), createCycle(0)], options)).toBe(false);
  const forged = createCycle(0);
  forged.actorExecutionEvidence = [];
  expect(hasValidSemanticCycles([forged], options)).toBe(false);
});

test('enforces exact and excess cycle output independently', () => {
  expect(dimensionsFor([createCycle(0, 4, 65_536)]).resource).toBe(true);
  expect(dimensionsFor([createCycle(0, 4, 65_537), createCycle(1, 0)]).resource).toBe(false);
  const invalidUsage = createCycle(0, 0);
  invalidUsage.usage!.inputTokens = 2_097_152;
  expect(
    hasValidSemanticCycles([invalidUsage], { cliVersion: '11.0.6', jsonSchemaVersion: 7 }),
  ).toBe(false);
});

test('session command totals may exceed an invocation ceiling while every cycle stays within its profile', () => {
  const cycles = [0, 1, 2].map((index) => createCycle(index, 4, 50_000, 60));
  expect(summarizeSemanticCycles(cycles).commandPolicyEvidence.completedCommandCount).toBe(192);
  expect(hasValidSemanticCycles(cycles, { cliVersion: '11.0.6', jsonSchemaVersion: 7 })).toBe(true);
  expect(dimensionsFor(cycles).resource).toBe(true);
});
