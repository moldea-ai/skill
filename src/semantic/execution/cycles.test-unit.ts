// @vitest-environment node
import { expect, test } from 'vitest';

import type { ISemanticCase } from '../cases/index.ts';
import { hasValidSemanticCycles, summarizeSemanticCycles } from './cycles.ts';
import { parseSemanticEvaluationHostOutput } from './host-output.ts';
import { createSemanticResultDimensions, isSemanticConfirmationEligible } from './outcomes.ts';
import type { ISemanticCycleEvidence } from './types.ts';

const createCycle = (
  requestIndex: number,
  callCount = 4,
  outputByteCount = 50_000,
  ordinaryCommandCount = 0,
): ISemanticCycleEvidence => {
  const output = [
    {
      type: 'moldea.cli-invocations',
      invocations: Array.from({ length: callCount }, () => ({
        arguments: [
          '--repository',
          '/mnt',
          '--',
          'content',
          '--path',
          'moldea/project.md',
          '--json',
          '--max-output-bytes',
          '65536',
        ],
        stdout: 'x'.repeat(outputByteCount),
        outputByteCount,
        exitCode: 0,
      })),
    },
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

test.each([
  [1_625_000, true],
  [1_625_001, false],
  [2_097_152, false],
  [2_097_153, false],
  [null, false],
])('first-cycle token usage including cached input %s -> resource %s', (tokens, passing) => {
  const first = createCycle(0, 0);
  first.usage =
    tokens === null
      ? null
      : { inputTokens: tokens - 100, cachedInputTokens: 800_000, outputTokens: 100 };
  const cycles = [first, createCycle(1, 0)];
  const dimensions = dimensionsFor(cycles);
  expect(dimensions.resource).toBe(passing);
  expect(dimensions.semantic).toBe(true);
  expect(dimensions.commandPolicy).toBe(true);
  expect(hasValidSemanticCycles(cycles, { cliVersion: '11.0.6', jsonSchemaVersion: 7 })).toBe(true);
  expect(isSemanticConfirmationEligible(dimensions)).toBe(!passing);
});

test.each([
  [{ inputTokens: 1_693_251, cachedInputTokens: 1_643_904, outputTokens: 1_963 }, 51_310],
  [{ inputTokens: 1_490_578, cachedInputTokens: 1_440_896, outputTokens: 2_781 }, 52_463],
])('grades resumed diagnostic usage %o by its %d added tokens', (usage, addedTokens) => {
  expect(usage.inputTokens - usage.cachedInputTokens + usage.outputTokens).toBe(addedTokens);
  const resumed = createCycle(1, 0);
  resumed.usage = usage;
  expect(dimensionsFor([createCycle(0, 0), resumed]).resource).toBe(true);
  expect(summarizeSemanticCycles([createCycle(0, 0), resumed]).usage).toStrictEqual({
    inputTokens: 1_000_000 + usage.inputTokens,
    cachedInputTokens: 800_000 + usage.cachedInputTokens,
    outputTokens: 100 + usage.outputTokens,
  });
});

test.each([
  [1_625_000, true],
  [1_625_001, false],
  [2_097_152, false],
  [2_097_153, false],
])('resumed uncached input plus output %d -> resource %s', (tokens, passing) => {
  const resumed = createCycle(1, 0);
  resumed.usage = {
    inputTokens: 2_000_000 + tokens - 100,
    cachedInputTokens: 2_000_000,
    outputTokens: 100,
  };
  const cycles = [createCycle(0, 0), resumed, createCycle(2, 0)];
  expect(hasValidSemanticCycles(cycles, { cliVersion: '11.0.6', jsonSchemaVersion: 7 })).toBe(true);
  const dimensions = dimensionsFor(cycles);
  expect(dimensions.resource).toBe(passing);
  expect(dimensions.operational).toBe(true);
  expect(isSemanticConfirmationEligible(dimensions)).toBe(!passing);
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
});

test.each([
  { inputTokens: 1, cachedInputTokens: 2, outputTokens: 0 },
  { inputTokens: -1, cachedInputTokens: 0, outputTokens: 0 },
  { inputTokens: 1.5, cachedInputTokens: 0, outputTokens: 0 },
  { inputTokens: Number.MAX_SAFE_INTEGER, cachedInputTokens: 0, outputTokens: 1 },
])('rejects malformed cycle usage %o', (usage) => {
  const cycle = createCycle(0, 0);
  cycle.usage = usage;
  expect(hasValidSemanticCycles([cycle], { cliVersion: '11.0.6', jsonSchemaVersion: 7 })).toBe(
    false,
  );
});

test('session command totals may exceed an invocation ceiling while every cycle stays within its profile', () => {
  const cycles = [0, 1, 2].map((index) => createCycle(index, 4, 50_000, 60));
  expect(summarizeSemanticCycles(cycles).commandPolicyEvidence.completedCommandCount).toBe(192);
  expect(hasValidSemanticCycles(cycles, { cliVersion: '11.0.6', jsonSchemaVersion: 7 })).toBe(true);
  expect(dimensionsFor(cycles).resource).toBe(true);
});

test('sums command ownership and keeps every cycle ordered events in request order', () => {
  const cycles = [createCycle(0, 1, 100, 2), createCycle(1, 0, 0, 1)];
  expect(hasValidSemanticCycles(cycles, { cliVersion: '11.0.6', jsonSchemaVersion: 7 })).toBe(true);
  const summary = summarizeSemanticCycles(cycles).commandPolicyEvidence;
  expect(summary.commandOwnership.canonical).toStrictEqual({
    commandCount: 3,
    maximumOutputByteCount: 0,
    outputByteCount: 0,
  });
  expect(summary.commandOwnership.cli).toStrictEqual({
    commandCount: 1,
    maximumOutputByteCount: 100,
    outputByteCount: 100,
  });
  expect(summary.moldeaEvents).toStrictEqual([
    ...cycles[0]!.commandPolicyEvidence.moldeaEvents,
    ...cycles[1]!.commandPolicyEvidence.moldeaEvents,
  ]);
  expect(summary.moldeaEvents).toHaveLength(4);
});
