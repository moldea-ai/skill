// @vitest-environment node
import { expect, test } from 'vitest';

import { parseSemanticEvaluationHostOutput, summarizeSemanticCycles } from '../execution/index.ts';
import { createSemanticReplay } from './replay.ts';
import type { ISemanticRecordedTrial } from './types.ts';

const createTrial = (confirmationIndex: 1 | null): ISemanticRecordedTrial => {
  const cycles = ['Inspect owner A', 'continue', 'Inspect owner C'].map(
    (developerRequest, requestIndex) => ({
      ...parseSemanticEvaluationHostOutput(
        [
          {
            type: 'item.completed',
            item: {
              type: 'agent_message',
              text: `${confirmationIndex === null ? 'Initial' : 'Confirmation'} response ${requestIndex + 1}`,
            },
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
          .join('\n'),
        { cliVersion: '11.0.6', jsonSchemaVersion: 7 },
      ),
      requestIndex,
      developerRequest,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    }),
  );
  const summary = summarizeSemanticCycles(cycles);
  const paidInvocations: ISemanticRecordedTrial['paidInvocations'] = [
    ...cycles.map((cycle) => ({ stage: 'actor' as const, usage: cycle.usage, cycle })),
    { stage: 'judge', usage: null },
  ];
  const passed = confirmationIndex !== null;
  const host = {
    developerInstructionsSha256: 'a'.repeat(64),
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'xhigh',
    version: '1.0.0',
  };
  return {
    cycles,
    paidInvocations,
    actorExecutionEvidence: summary.actorExecutionEvidence,
    actorResponse: summary.response,
    developerDirection: cycles[0]!.developerRequest,
    gitInvocationEvidence: summary.gitInvocationEvidence,
    operationalRetries: { actorFailureCount: 0, judgeFailureCount: 0, lastFailure: null },
    stageIdentities: { actorSha256: 'a'.repeat(64), judgeSha256: 'b'.repeat(64) },
    workspaceChanges: { created: [], deleted: [], modified: [] },
    trial: {
      cycles,
      paidInvocations,
      actorCommandPolicyEvidence: summary.commandPolicyEvidence,
      actorResourceEvidence: summary.actorResourceEvidence,
      actorHost: { ...host, role: 'actor' },
      actorUsage: summary.usage,
      judgeCommandPolicyEvidence: summary.commandPolicyEvidence,
      judgeHost: { ...host, role: 'judge' },
      judgeUsage: null,
      confirmationEligible: !passed,
      confirmationIndex,
      kind: confirmationIndex === null ? 'initial' : 'confirmation',
      evaluatedAt: '2026-10-17T00:00:00.000Z',
      dimensions: {
        commandPolicy: true,
        mountIntegrity: true,
        repositoryControl: true,
        operational: true,
        resource: true,
        semantic: passed,
      },
      executionOrigin: 'executed',
      failureClassifications: passed ? [] : ['semantic'],
      forbidden: [],
      observed: [],
      stageReuse: null,
      passed,
      rationale: 'One verdict for all requests.',
    },
  };
};

test('projects every request, command summary and response before one workspace and verdict per trial', () => {
  const replay = createSemanticReplay({
    id: 'multi-request',
    status: 'recovered',
    confirmationStatus: 'passed',
    trials: [createTrial(null), createTrial(1)],
  });
  for (const [trialIndex, trial] of replay.trials.entries()) {
    expect(trial.steps.map(({ kind }) => kind)).toStrictEqual([
      'message',
      'command',
      'message',
      'message',
      'command',
      'message',
      'message',
      'command',
      'message',
      'workspace',
      'verdict',
    ]);
    expect(
      trial.steps.filter((step) => step.kind === 'message').map((step) => step.content),
    ).toStrictEqual([
      'Inspect owner A',
      `${trialIndex === 0 ? 'Initial' : 'Confirmation'} response 1`,
      'continue',
      `${trialIndex === 0 ? 'Initial' : 'Confirmation'} response 2`,
      'Inspect owner C',
      `${trialIndex === 0 ? 'Initial' : 'Confirmation'} response 3`,
    ]);
    expect(
      trial.steps.filter((step) => step.kind === 'command').map((step) => step.operation),
    ).toStrictEqual([
      'Request 1: No completed commands recorded',
      'Request 2: No completed commands recorded',
      'Request 3: No completed commands recorded',
    ]);
  }
  expect(replay.trials.map(({ id }) => id)).toStrictEqual(['initial', 'confirmation-1']);
});
