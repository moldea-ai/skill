// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  QualificationCaseResultSchema,
  QualificationCaseScenarioSchema,
  QualificationCommandPolicyEvidenceSchema,
  QualificationExecutionEnvironmentSchema,
  ModelUsageSchema,
  QualificationProfileSchema,
  QualificationStageCheckpointSchema,
  QualificationTrialResultSchema,
  type IQualificationTrialResult,
} from './types.ts';

const createScenario = (pathPattern: string) => ({
  version: 2,
  id: 'path-pattern',
  title: 'Path pattern',
  purpose: 'Validate a workspace path pattern.',
  resourceProfile: 'ordinary',
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
  judgeRequirements: [
    {
      id: 'path-contract',
      description: 'The path contract is valid.',
      evaluation: { kind: 'runner', checks: ['workspace-assertions'] },
    },
  ],
});

test('accepts only xhigh actors and xhigh judges for current qualification execution', () => {
  const environment = {
    model: 'gpt-5.6-sol',
    actorReasoningEffort: 'xhigh',
    judgeReasoningEffort: 'xhigh',
    codexVersion: 'codex-cli test',
    nodeVersion: process.version,
    pnpmVersion: '11.9.0',
    gitVersion: 'git version test',
    allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
    hostTimeoutMs: 900_000,
    modelEndpoint: null,
    sslCertificateFileSha256: null,
  };

  expect(QualificationExecutionEnvironmentSchema.safeParse(environment).success).toBe(true);
  expect(
    QualificationExecutionEnvironmentSchema.safeParse({
      ...environment,
      actorReasoningEffort: 'high',
    }).success,
  ).toBe(false);
});

test('validates model usage structure independently from source-committed resource profiles', () => {
  expect(
    ModelUsageSchema.safeParse({
      cachedInputTokens: 524_288,
      inputTokens: 524_288,
      outputTokens: 524_288,
    }).success,
  ).toBe(true);
  expect(
    ModelUsageSchema.safeParse({
      cachedInputTokens: 2,
      inputTokens: 1,
      outputTokens: 0,
    }).success,
  ).toBe(false);
  expect(
    ModelUsageSchema.safeParse({
      cachedInputTokens: 0,
      inputTokens: 2_097_152,
      outputTokens: 1,
    }).success,
  ).toBe(true);
});

test('requires privacy-safe command-policy reasons to be counted, unique, and sorted', () => {
  const evidence = {
    completedCommandCount: 2,
    credentialExposure: { status: 'not-observed', observedCount: 0, reasons: [] },
    maximumCommandOutputByteCount: 0,
    modelVisibleToolOutputByteCount: 0,
    moldeaCommandCount: 0,
    moldeaOutputByteCount: 0,
    networkAccess: {
      status: 'observed',
      observedCount: 1,
      indeterminateCount: 1,
      reasons: [
        { code: 'dynamic-execution', count: 1 },
        { code: 'network-client', count: 1 },
      ],
    },
    sensitiveAccess: {
      status: 'not-observed',
      observedCount: 0,
      indeterminateCount: 0,
      reasons: [],
    },
  };

  expect(QualificationCommandPolicyEvidenceSchema.safeParse(evidence).success).toBe(true);
  for (const reasons of [
    [{ code: 'network-client', count: 1 }],
    [
      { code: 'network-client', count: 1 },
      { code: 'dynamic-execution', count: 1 },
    ],
    [
      { code: 'dynamic-execution', count: 1 },
      { code: 'dynamic-execution', count: 1 },
    ],
  ]) {
    expect(
      QualificationCommandPolicyEvidenceSchema.safeParse({
        ...evidence,
        networkAccess: { ...evidence.networkAccess, reasons },
      }).success,
    ).toBe(false);
  }

  expect(
    QualificationCommandPolicyEvidenceSchema.safeParse({
      ...evidence,
      networkAccess: {
        status: 'observed',
        observedCount: 1,
        indeterminateCount: 0,
        reasons: [{ code: 'broad-filesystem-read', count: 1 }],
      },
    }).success,
  ).toBe(false);
  expect(
    QualificationCommandPolicyEvidenceSchema.safeParse({
      ...evidence,
      sensitiveAccess: {
        status: 'observed',
        observedCount: 1,
        indeterminateCount: 0,
        reasons: [{ code: 'network-client', count: 1 }],
      },
    }).success,
  ).toBe(false);
  expect(
    QualificationCommandPolicyEvidenceSchema.safeParse({
      ...evidence,
      maximumCommandOutputByteCount: 1,
      modelVisibleToolOutputByteCount: 0,
    }).success,
  ).toBe(false);
  expect(
    QualificationCommandPolicyEvidenceSchema.safeParse({
      ...evidence,
      completedCommandCount: 0,
      maximumCommandOutputByteCount: 1,
      modelVisibleToolOutputByteCount: 1,
    }).success,
  ).toBe(false);
  expect(
    QualificationCommandPolicyEvidenceSchema.safeParse({
      ...evidence,
      completedCommandCount: 0,
      moldeaCommandCount: 1,
    }).success,
  ).toBe(false);
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

test.each(['1.2.3', '5.0.0-beta.42', '1.2.3+verified'])(
  'QualificationProfileSchema(%s) -> accepts exact package version',
  (version) => {
    expect(
      QualificationProfileSchema.safeParse({
        version: 2,
        adapterId: 'adapter',
        implementationId: 'implementation',
        title: 'Profile',
        description: 'Profile description.',
        runtimePackages: [{ name: 'runtime', version }],
        probesFile: 'probes.yaml',
        cases: [{ id: 'case', projectDirectory: 'projects/case', scenarioFile: 'scenario.yaml' }],
      }).success,
    ).toBe(true);
  },
);

test.each(['1.2', '^1.2.3', 'v1.2.3', 'latest'])(
  'QualificationProfileSchema(%s) -> rejects non-exact package version',
  (version) => {
    expect(
      QualificationProfileSchema.safeParse({
        version: 2,
        adapterId: 'adapter',
        implementationId: 'implementation',
        title: 'Profile',
        description: 'Profile description.',
        runtimePackages: [{ name: 'runtime', version }],
        probesFile: 'probes.yaml',
        cases: [{ id: 'case', projectDirectory: 'projects/case', scenarioFile: 'scenario.yaml' }],
      }).success,
    ).toBe(false);
  },
);

test('rejects duplicate scenario sets and requirement declarations before execution', () => {
  const scenario = createScenario('moldea/runtimes/*.md');

  expect(
    QualificationCaseScenarioSchema.safeParse({
      ...scenario,
      workspace: {
        ...scenario.workspace,
        allowedChangePathPatterns: ['moldea/runtimes/*.md', 'moldea/runtimes/*.md'],
      },
    }).success,
  ).toBe(false);
  expect(
    QualificationCaseScenarioSchema.safeParse({
      ...scenario,
      judgeRequirements: [...scenario.judgeRequirements, { ...scenario.judgeRequirements[0] }],
    }).success,
  ).toBe(false);
  expect(
    QualificationCaseScenarioSchema.safeParse({
      ...scenario,
      judgeRequirements: [
        {
          id: 'duplicate-evidence',
          description: 'The semantic evidence agrees.',
          evaluation: {
            kind: 'judge',
            evidenceSources: ['actor-output', 'actor-output'],
          },
        },
      ],
    }).success,
  ).toBe(false);
});

test('requires command-policy evidence for authority-sensitive requirements', () => {
  const scenario = createScenario('moldea/runtimes/*.md');

  expect(
    QualificationCaseScenarioSchema.safeParse({
      ...scenario,
      judgeRequirements: [
        {
          id: 'network-boundary',
          description: 'The actor did not use network access or expose a credential.',
          evaluation: { kind: 'judge', evidenceSources: ['actor-output'] },
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    QualificationCaseScenarioSchema.safeParse({
      ...scenario,
      judgeRequirements: [
        {
          id: 'network-boundary',
          description: 'The actor did not use network access or expose a credential.',
          evaluation: { kind: 'runner', checks: ['actor-command-policy'] },
        },
      ],
    }).success,
  ).toBe(true);
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
    confirmationEligible: !passed,
    dimensions: {
      semantic: passed,
      resource: true,
      commandPolicy: true,
      repositoryControl: true,
      mountIntegrity: true,
      operational: true,
    },
    failureClassifications: passed ? [] : ['semantic'],
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
    actorReuseSourceAttemptId: null,
    judgeReuseSourceAttemptId: null,
    requirementAssessments: [
      {
        id: 'test-requirement',
        evaluator: 'judge',
        verdict: passed ? 'pass' : 'fail',
        evidence: passed ? 'The requirement passed.' : 'The requirement failed.',
      },
    ],
    failures: passed ? [] : [`${trialId} failed.`],
  });
};

const createTerminalNonSemanticTrial = (): IQualificationTrialResult => {
  const trial = createTrial('initial', false);

  return QualificationTrialResultSchema.parse({
    ...trial,
    confirmationEligible: false,
    dimensions: { ...trial.dimensions, semantic: true, repositoryControl: false },
    failureClassifications: ['repositoryControl'],
  });
};

describe('protocol 10 qualification contracts', () => {
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
    ['failed', 'not-applicable', [createTerminalNonSemanticTrial()], ['initial failed.']],
    ['failed', 'not-run', [createTrial('initial', false)], ['initial failed.']],
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
          reuse: null,
        }).success,
      ).toBe(true);
    },
  );

  test('rejects incomplete and partially reused confirmation histories', () => {
    const partiallyReusedConfirmation = {
      ...createTrial('confirmation-1', true),
      actorReuseSourceAttemptId: 'prior-attempt',
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
        reuse: null,
      }).success,
    ).toBe(false);
    expect(
      QualificationCaseResultSchema.safeParse({
        caseId: 'test-case',
        title: 'Test case',
        status: 'failed',
        confirmationStatus: 'not-applicable',
        durationMs: 1,
        trials: [createTrial('initial', false)],
        failures: ['initial failed.'],
        reuse: null,
      }).success,
    ).toBe(false);
    expect(
      QualificationCaseResultSchema.safeParse({
        caseId: 'test-case',
        title: 'Test case',
        status: 'recovered',
        confirmationStatus: 'passed',
        durationMs: 3,
        trials: [
          createTrial('initial', false),
          partiallyReusedConfirmation,
          createTrial('confirmation-2', true),
        ],
        failures: [],
        reuse: null,
      }).success,
    ).toBe(false);
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
      stageIdentity: 'a'.repeat(64),
      reuseSourceAttemptId: null,
      error: null,
      hasUsedOperationalStopResume: false,
      operationalRetries: [retry],
      operationalStops: [],
    };
    const stop = {
      category: 'timed-out',
      failedAt: '2026-08-27T16:01:00.000Z',
      failureCount: 2,
      maximumRetryCount: 1,
    } as const;

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
        status: 'reused',
      }).success,
    ).toBe(false);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        status: 'stopped',
        operationalStops: [stop],
      }).success,
    ).toBe(true);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        status: 'pending',
        startedAt: null,
        hasUsedOperationalStopResume: true,
        operationalStops: [stop],
      }).success,
    ).toBe(true);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        status: 'stopped',
        hasUsedOperationalStopResume: true,
        operationalStops: [stop],
      }).success,
    ).toBe(false);
    expect(
      QualificationStageCheckpointSchema.safeParse({
        ...stage,
        status: 'stopped',
        hasUsedOperationalStopResume: true,
        operationalStops: [stop, { ...stop, failedAt: '2026-08-27T16:02:00.000Z' }],
      }).success,
    ).toBe(true);
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
