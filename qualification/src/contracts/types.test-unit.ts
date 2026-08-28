// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  QualificationCaseResultSchema,
  QualificationCaseScenarioSchema,
  QualificationHistoricalStageCheckpointSchema,
  QualificationStageCheckpointSchema,
  QualificationTrialResultSchema,
  type IQualificationTrialResult,
} from './types.ts';

const createScenario = (pathPattern: string) => ({
  version: 1,
  id: 'path-pattern',
  title: 'Path pattern',
  purpose: 'Validate a workspace path pattern.',
  taskFile: 'task.md',
  seedDirectory: 'seed',
  removePaths: [],
  expectedRemovePaths: [],
  inspection: { before: 'valid', after: 'valid' },
  deterministicEvidence: {
    before: {
      requiredDiagnosticCodes: [],
      forbiddenDiagnosticCodes: [],
      requiredEvidenceKinds: [],
      forbiddenEvidenceKinds: [],
    },
    after: {
      requiredDiagnosticCodes: [],
      forbiddenDiagnosticCodes: [],
      requiredEvidenceKinds: [],
      forbiddenEvidenceKinds: [],
    },
  },
  expectedActorOutcome: 'completed',
  workspace: {
    expectation: 'changed',
    mustPreservePaths: [],
    mustChangePaths: [],
    mustExistPaths: [],
    mustNotExistPaths: [],
    allowedChangePaths: [],
    allowedChangePathPatterns: [pathPattern],
    mustChangePathPatterns: [pathPattern],
  },
  judgeRequirements: [{ id: 'path-contract', description: 'The path contract is valid.' }],
});

test.each(['moldea/runtimes/*.md', 'moldea/runtimes/**/*.md'])(
  'QualificationCaseScenarioSchema(%s) -> accepts',
  (pathPattern) => {
    expect(QualificationCaseScenarioSchema.safeParse(createScenario(pathPattern)).success).toBe(
      true,
    );
  },
);

test.each([
  '/moldea/runtimes/*.md',
  '../moldea/runtimes/*.md',
  'moldea\\runtimes\\*.md',
  'moldea/runtimes/custom.md',
  'moldea/runtimes/***.md',
  'moldea/runtimes/{custom,other}.md',
])('QualificationCaseScenarioSchema(%s) -> rejects', (pathPattern) => {
  expect(QualificationCaseScenarioSchema.safeParse(createScenario(pathPattern)).success).toBe(
    false,
  );
});

const createTrial = (
  trialId: IQualificationTrialResult['trialId'],
  passed: boolean,
): IQualificationTrialResult => {
  const confirmationIndex =
    trialId === 'initial' ? null : Number(trialId.slice('confirmation-'.length));
  const trialRoot = `cases/test-case/trials/${trialId}`;

  return QualificationTrialResultSchema.parse({
    trialId,
    kind: trialId === 'initial' ? 'initial' : 'confirmation',
    confirmationIndex,
    passed,
    durationMs: 1,
    deterministicBeforePath: `${trialRoot}/deterministic-before.json`,
    deterministicAfterPath: `${trialRoot}/deterministic-after.json`,
    actorOutputPath: `${trialRoot}/actor-output.json`,
    judgeStatus: 'completed',
    judgeOutputPath: `${trialRoot}/judge-output.json`,
    judgeSkippedPath: null,
    workspaceAssertionsPath: `${trialRoot}/workspace-assertions.json`,
    patchPath: `${trialRoot}/workspace.patch`,
    actorUsage: null,
    judgeUsage: null,
    actorEvidenceCreatedAt: '2026-08-27T16:00:00.000Z',
    judgeEvidenceCreatedAt: '2026-08-27T16:00:01.000Z',
    actorCacheSourceAttemptId: null,
    judgeCacheSourceAttemptId: null,
    failures: passed ? [] : [`${trialId} failed.`],
  });
};

describe('protocol 6 qualification contracts', () => {
  test.each([
    ['passed', 'not-required', [createTrial('initial', true)], []],
    [
      'recovered',
      'passed',
      [
        createTrial('initial', false),
        createTrial('confirmation-1', true),
        createTrial('confirmation-2', true),
      ],
      [],
    ],
    [
      'failed',
      'rejected',
      [createTrial('initial', false), createTrial('confirmation-1', false)],
      ['confirmation-1 failed.'],
    ],
    [
      'failed',
      'rejected',
      [
        createTrial('initial', false),
        createTrial('confirmation-1', true),
        createTrial('confirmation-2', false),
      ],
      ['confirmation-2 failed.'],
    ],
  ] as const)(
    'accepts the %s terminal confirmation decision',
    (status, confirmationStatus, trials, failures) => {
      expect(
        QualificationCaseResultSchema.safeParse({
          caseId: 'test-case',
          title: 'Test case',
          status,
          confirmationStatus,
          durationMs: trials.length,
          trials,
          failures,
        }).success,
      ).toBe(true);
    },
  );

  test('rejects incomplete and cache-derived confirmation histories', () => {
    const cachedConfirmation = {
      ...createTrial('confirmation-1', true),
      actorCacheSourceAttemptId: 'prior-attempt',
    };

    expect(
      QualificationCaseResultSchema.safeParse({
        caseId: 'test-case',
        title: 'Test case',
        status: 'failed',
        confirmationStatus: 'rejected',
        durationMs: 1,
        trials: [createTrial('initial', false)],
        failures: ['initial failed.'],
      }).success,
    ).toBe(false);
    expect(QualificationTrialResultSchema.safeParse(cachedConfirmation).success).toBe(false);
  });

  test('accepts contiguous model retries and rejects unsafe retry state', () => {
    const retry = {
      category: 'timed-out',
      failedAt: '2026-08-27T16:00:00.000Z',
      failureCount: 1,
      retryDelayMs: 5_000,
    } as const;
    const stage = {
      id: 'case:test-case:trial:initial:actor',
      status: 'running',
      startedAt: '2026-08-27T16:00:00.000Z',
      completedAt: null,
      durationMs: null,
      cacheKey: 'a'.repeat(64),
      cacheSourceAttemptId: null,
      error: null,
      operationalRetries: [retry],
    };

    expect(QualificationStageCheckpointSchema.safeParse(stage).success).toBe(true);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        operationalRetries: [{ ...retry, failureCount: 2 }],
      }).success,
    ).toBe(false);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        id: 'coverage',
      }).success,
    ).toBe(false);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        status: 'cached',
      }).success,
    ).toBe(false);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        operationalRetries: [{ ...retry, retryDelayMs: 3_749 }],
      }).success,
    ).toBe(false);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        operationalRetries: [{ ...retry, retryDelayMs: 5_001 }],
      }).success,
    ).toBe(false);
  });
});

test('keeps the protocol 3–5 stage contract frozen without retry evidence', () => {
  const historicalStage = {
    id: 'case:test-case:actor',
    status: 'passed',
    startedAt: '2026-08-20T00:00:00.000Z',
    completedAt: '2026-08-20T00:00:01.000Z',
    durationMs: 1_000,
    cacheKey: null,
    cacheSourceAttemptId: null,
    error: null,
  } as const;

  expect(QualificationHistoricalStageCheckpointSchema.safeParse(historicalStage).success).toBe(
    true,
  );
  expect(
    QualificationHistoricalStageCheckpointSchema.safeParse({
      ...historicalStage,
      operationalRetries: [],
    }).success,
  ).toBe(false);
});
