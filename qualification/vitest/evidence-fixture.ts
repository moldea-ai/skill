import path from 'node:path';
import { z } from 'zod';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../tooling/resource-calibration/profiles.mjs';

import {
  QUALIFICATION_CONFIRMATION_POLICY,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  QUALIFICATION_TRIAL_IDS,
} from '../src/constants/index.ts';
import {
  ActorOutputSchema,
  JudgeOutputSchema,
  QualificationAttemptResultSchema,
  QualificationTrialResultSchema,
  type IQualificationAttemptResult,
  type IQualificationCommandPolicyEvidence,
  type IQualificationProvenance,
  type IQualificationTrialResult,
} from '../src/contracts/index.ts';
import { calculateQualificationProfileDigest } from '../src/execution/fingerprints.ts';
import { createQualificationStageIds } from '../src/execution/stages.ts';
import {
  ensureDirectory,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../src/filesystem/index.ts';
import { buildActorPrompt } from '../src/prompts/index.ts';

const CASE_ID = 'release-case';
const CASE_TITLE = 'Release case';
const FAILED_CASE_ID = 'failed-release-case';
const FAILED_CASE_TITLE = 'Failed release case';
const CREATED_AT = '2026-08-20T10:00:00.000Z';
const COMPLETED_AT = '2026-08-20T10:01:00.000Z';
const JUDGE_CREATED_AT = '2026-08-20T10:00:20.000Z';
const ACTOR_CREATED_AT = '2026-08-20T10:00:10.000Z';
const CLAIM_ID = 'qualification.support-gate';
const WORKSPACE_FAILURE = 'Unexpected changed path unexpected.md.';
const MODEL_USAGE = { cachedInputTokens: 0, inputTokens: 128, outputTokens: 16 } as const;
const EMPTY_COMMAND_POLICY: IQualificationCommandPolicyEvidence = {
  completedCommandCount: 0,
  credentialExposure: { status: 'not-observed', observedCount: 0, reasons: [] },
  maximumCommandOutputByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  moldeaCommandCount: 0,
  moldeaOutputByteCount: 0,
  networkAccess: { status: 'not-observed', observedCount: 0, indeterminateCount: 0, reasons: [] },
  sensitiveAccess: {
    status: 'not-observed',
    observedCount: 0,
    indeterminateCount: 0,
    reasons: [],
  },
};

const createStage = (
  id: string,
  status: IQualificationAttemptResult['stages'][number]['status'],
  stageIdentity: string | null = null,
  operationalRetries: IQualificationAttemptResult['stages'][number]['operationalRetries'] = [],
): IQualificationAttemptResult['stages'][number] => ({
  id,
  status,
  startedAt: status === 'pending' ? null : CREATED_AT,
  completedAt: status === 'pending' ? null : COMPLETED_AT,
  durationMs: status === 'pending' ? null : status === 'skipped' ? 0 : 1_000,
  stageIdentity,
  reuseSourceAttemptId: null,
  error: null,
  hasUsedOperationalStopResume: false,
  operationalRetries,
  operationalStops: [],
});

const createTrialResult = (
  caseId: string,
  trialId: IQualificationTrialResult['trialId'],
  passed: boolean,
  isJudgeSkipped = false,
): IQualificationTrialResult => {
  const trialRoot = `cases/${caseId}/trials/${trialId}`;
  const confirmationIndex =
    trialId === 'initial' ? null : Number(trialId.slice('confirmation-'.length));

  return QualificationTrialResultSchema.parse({
    trialId,
    kind: trialId === 'initial' ? 'initial' : 'confirmation',
    confirmationIndex,
    confirmationEligible: !passed && !isJudgeSkipped,
    dimensions: {
      semantic: passed,
      resource: true,
      commandPolicy: true,
      repositoryControl: true,
      mountIntegrity: !isJudgeSkipped,
      operational: true,
    },
    failureClassifications: passed
      ? []
      : isJudgeSkipped
        ? ['semantic', 'mountIntegrity']
        : ['semantic'],
    passed,
    durationMs: 1_000,
    deterministicBeforePath: `${trialRoot}/deterministic-before.json`,
    deterministicAfterPath: `${trialRoot}/deterministic-after.json`,
    actorOutputPath: `${trialRoot}/actor-output.json`,
    judgeStatus: isJudgeSkipped ? 'skipped' : 'completed',
    judgeOutputPath: isJudgeSkipped ? null : `${trialRoot}/judge-output.json`,
    judgeSkippedPath: isJudgeSkipped ? `${trialRoot}/judge-skipped.json` : null,
    workspaceAssertionsPath: `${trialRoot}/workspace-assertions.json`,
    patchPath: `${trialRoot}/workspace.patch`,
    actorUsage: MODEL_USAGE,
    judgeUsage: isJudgeSkipped ? null : MODEL_USAGE,
    actorEvidenceCreatedAt: ACTOR_CREATED_AT,
    judgeEvidenceCreatedAt: isJudgeSkipped ? null : JUDGE_CREATED_AT,
    actorReuseSourceAttemptId: null,
    judgeReuseSourceAttemptId: null,
    requirementAssessments: [
      {
        id: 'complete-evidence',
        evaluator: 'judge',
        verdict: isJudgeSkipped ? 'not-evaluated' : passed ? 'pass' : 'fail',
        evidence: isJudgeSkipped
          ? 'The skipped judge stage did not evaluate this semantic requirement.'
          : passed
            ? 'The deterministic and workspace evidence passed.'
            : 'Fixture failure.',
      },
    ],
    failures: passed
      ? []
      : isJudgeSkipped
        ? [WORKSPACE_FAILURE]
        : ['Requirement complete-evidence failed: Fixture failure.', 'Fixture failure.'],
  });
};

const createScenarioSource = (caseId: string, title: string): string =>
  [
    'version: 2',
    `id: ${caseId}`,
    `title: ${title}`,
    'purpose: Verify complete passing evidence.',
    'resourceProfile: ordinary',
    'taskFile: task.md',
    'seedDirectory: seed',
    'removePaths: []',
    'expectedRemovePaths: []',
    'inspection:',
    '  before: valid',
    '  after: valid',
    'deterministicEvidence:',
    '  before:',
    '    requiredDiagnosticCodes: []',
    '    forbiddenDiagnosticCodes: []',
    '    requiredEvidenceKinds: []',
    '    forbiddenEvidenceKinds: []',
    '  after:',
    '    requiredDiagnosticCodes: []',
    '    forbiddenDiagnosticCodes: []',
    '    requiredEvidenceKinds: []',
    '    forbiddenEvidenceKinds: []',
    'expectedActorOutcome: completed',
    'workspace:',
    '  expectation: changed',
    '  mustPreservePaths: []',
    '  mustChangePaths: []',
    '  mustExistPaths: []',
    '  mustNotExistPaths: []',
    '  allowedChangePaths: []',
    '  allowedChangePathPatterns:',
    '    - moldea/runtimes/**/*.md',
    '  mustChangePathPatterns:',
    '    - moldea/runtimes/**/*.md',
    'judgeRequirements:',
    '  - id: complete-evidence',
    '    description: Every fixture contract passed.',
    '    evaluation:',
    '      kind: judge',
    '      evidenceSources:',
    '        - current-workspace',
    '',
  ].join('\n');

/** Seeds one complete protocol 10 Custom profile and its engine-verifiable public evidence. */
export const seedPassingQualificationEvidenceFixture = async (options: {
  artifactDirectory: string;
  attemptId: string;
  candidateFingerprint?: string;
  hasFailedCompanionCase?: boolean;
  hasOperationalRetry?: boolean;
  hasSkippedInitialJudge?: boolean;
  isRecovered?: boolean;
  packages?: IQualificationProvenance['packages'];
  packagesRepositoryCommit?: string;
  packagesRepositoryFingerprint?: string;
  qualificationDigest?: string;
  qualificationRepositoryCommit?: string;
  resultsRoot: string;
  skillRepositoryCommit?: string;
  skillRepositoryFingerprint?: string;
  targetDigest?: string;
}): Promise<IQualificationAttemptResult> => {
  const profilesRoot = path.join(options.resultsRoot, '..', 'profiles');
  const casesRoot = path.join(options.resultsRoot, '..', 'cases');
  const fixturesRoot = path.join(options.resultsRoot, '..', '..', 'fixtures');
  const profileDirectory = path.join(profilesRoot, 't1');
  const projectDirectory = path.join(profileDirectory, 'cases', 'c1');
  const failedProjectDirectory = path.join(profileDirectory, 'cases', 'c2');
  await Promise.all([
    ensureDirectory(projectDirectory),
    ...(options.hasFailedCompanionCase === true ? [ensureDirectory(failedProjectDirectory)] : []),
    ensureDirectory(fixturesRoot),
  ]);
  await Promise.all([
    writeJsonFileAtomically(path.join(fixturesRoot, 'resource-calibration.json'), {
      schemaVersion: 1,
      profiles: MOLDEA_SKILL_RESOURCE_PROFILES,
    }),
    writeTextFileAtomically(
      path.join(casesRoot, 'cases.yaml'),
      [
        'version: 2',
        'cases:',
        `  - id: ${CASE_ID}`,
        `    title: ${CASE_TITLE}`,
        '    layer: universal-baseline',
        '    description: Verify complete passing evidence.',
        '    challenge: Exercise the reusable Custom baseline.',
        ...(options.hasFailedCompanionCase === true
          ? [
              `  - id: ${FAILED_CASE_ID}`,
              `    title: ${FAILED_CASE_TITLE}`,
              '    layer: universal-baseline',
              '    description: Verify failed companion evidence.',
              '    challenge: Preserve one confirmed failure beside a passing case.',
            ]
          : []),
        '',
      ].join('\n'),
    ),
    writeTextFileAtomically(
      path.join(profilesRoot, 'index.yaml'),
      [
        'version: 1',
        'targets:',
        '  - key: t1',
        '    adapterId: custom',
        '    implementationId: custom',
        '',
      ].join('\n'),
    ),
    writeTextFileAtomically(
      path.join(profileDirectory, 'profile.yaml'),
      [
        'version: 2',
        'adapterId: custom',
        'implementationId: custom',
        'title: Custom qualification fixture',
        'description: Complete passing evidence fixture.',
        'probesFile: probes/claims.yaml',
        'cases:',
        `  - id: ${CASE_ID}`,
        '    projectDirectory: cases/c1',
        '    scenarioFile: scenario.yaml',
        ...(options.hasFailedCompanionCase === true
          ? [
              `  - id: ${FAILED_CASE_ID}`,
              '    projectDirectory: cases/c2',
              '    scenarioFile: scenario.yaml',
            ]
          : []),
        '',
      ].join('\n'),
    ),
    writeTextFileAtomically(
      path.join(profileDirectory, 'probes', 'claims.yaml'),
      [
        'version: 2',
        'adapterId: custom',
        'implementationId: custom',
        'probes:',
        '  - id: support-gate',
        '    kind: support-gate',
        `    matrixPath: ${CLAIM_ID}`,
        '    description: Complete fixture coverage.',
        '    coveredBy:',
        `      - ${CASE_ID}`,
        ...(options.hasFailedCompanionCase === true ? [`      - ${FAILED_CASE_ID}`] : []),
        '',
      ].join('\n'),
    ),
    writeTextFileAtomically(
      path.join(projectDirectory, 'scenario.yaml'),
      [
        'version: 2',
        `id: ${CASE_ID}`,
        `title: ${CASE_TITLE}`,
        'purpose: Verify complete passing evidence.',
        'resourceProfile: ordinary',
        'taskFile: task.md',
        'seedDirectory: seed',
        'removePaths: []',
        'expectedRemovePaths: []',
        'inspection:',
        '  before: valid',
        '  after: valid',
        'deterministicEvidence:',
        '  before:',
        '    requiredDiagnosticCodes: []',
        '    forbiddenDiagnosticCodes: []',
        '    requiredEvidenceKinds: []',
        '    forbiddenEvidenceKinds: []',
        '  after:',
        '    requiredDiagnosticCodes: []',
        '    forbiddenDiagnosticCodes: []',
        '    requiredEvidenceKinds: []',
        '    forbiddenEvidenceKinds: []',
        'expectedActorOutcome: completed',
        'workspace:',
        '  expectation: changed',
        '  mustPreservePaths: []',
        '  mustChangePaths: []',
        '  mustExistPaths: []',
        '  mustNotExistPaths: []',
        '  allowedChangePaths: []',
        '  allowedChangePathPatterns:',
        '    - moldea/runtimes/**/*.md',
        '  mustChangePathPatterns:',
        '    - moldea/runtimes/**/*.md',
        'judgeRequirements:',
        '  - id: complete-evidence',
        '    description: Every fixture contract passed.',
        '    evaluation:',
        '      kind: judge',
        '      evidenceSources:',
        '        - current-workspace',
        '',
      ].join('\n'),
    ),
    ...(options.hasFailedCompanionCase === true
      ? [
          writeTextFileAtomically(
            path.join(failedProjectDirectory, 'scenario.yaml'),
            createScenarioSource(FAILED_CASE_ID, FAILED_CASE_TITLE),
          ),
        ]
      : []),
  ]);

  const profileDigest = await calculateQualificationProfileDigest(profileDirectory);
  const actorOutput = {
    outcome: 'completed' as const,
    summary: 'Created grounded runtime guidance for the fixture.',
    changedFiles: ['moldea/runtimes/release-case.md'],
    observations: ['The runtime guidance is referenced by the fixture manifest.'],
    unresolved: [],
  };
  const deterministicArtifact = {
    summary: {
      passed: true,
      inspectionStatus: 'valid' as const,
      repositoryFilesystemValid: true,
      memoryRepositoryEquivalent: true,
      coreValid: true,
      cliCompositionValid: true,
      cliIdentityValid: true,
      cliPackageInventoryValid: true,
      cliAdapterInventoryValid: true,
      cliEnvelopeValid: true,
      cliValidateStatus: 'valid' as const,
      cliInspectStatus: 'valid' as const,
      typecheckPassed: true,
      repositoryUnchanged: true,
      failures: [],
      durationMs: 1,
    },
    details: {
      direct: {},
      cliComposition: {},
      cliValidate: {},
      cliInspect: {},
      typecheck: { exitCode: 0, stdout: '', stderr: '' },
    },
  };
  const runtimeGuidanceEntry = {
    path: 'moldea/runtimes/release-case.md',
    kind: 'file' as const,
    mode: 0o100644,
    sha256: 'f'.repeat(64),
  };
  const workspaceAssertions = {
    passed: true,
    failures: [],
    before: [],
    after: [runtimeGuidanceEntry],
    changedPaths: [runtimeGuidanceEntry.path],
  };
  const failedWorkspaceAssertions = {
    passed: false,
    failures: [WORKSPACE_FAILURE],
    before: [],
    after: [
      {
        ...runtimeGuidanceEntry,
        path: 'unexpected.md',
      },
    ],
    changedPaths: ['unexpected.md'],
  };
  const passingJudgeOutput = {
    verdict: 'pass' as const,
    summary: 'Every declared fixture requirement passed.',
    requirements: [
      {
        id: 'complete-evidence',
        verdict: 'pass' as const,
        evidence: 'The deterministic and workspace evidence passed.',
      },
    ],
    failures: [],
  };
  const failingJudgeOutput = {
    verdict: 'fail' as const,
    summary: 'The original trial failed.',
    requirements: [
      {
        id: 'complete-evidence',
        verdict: 'fail' as const,
        evidence: 'Fixture failure.',
      },
    ],
    failures: ['Fixture failure.'],
  };
  const trials = options.hasSkippedInitialJudge
    ? [createTrialResult(CASE_ID, 'initial', false, true)]
    : options.isRecovered
      ? [
          createTrialResult(CASE_ID, 'initial', false),
          createTrialResult(CASE_ID, 'confirmation-1', true),
          createTrialResult(CASE_ID, 'confirmation-2', true),
        ]
      : [createTrialResult(CASE_ID, 'initial', true)];
  const caseResult: IQualificationAttemptResult['cases'][number] = {
    caseId: CASE_ID,
    title: CASE_TITLE,
    status: options.hasSkippedInitialJudge
      ? 'failed'
      : options.isRecovered
        ? 'recovered'
        : 'passed',
    confirmationStatus: options.hasSkippedInitialJudge
      ? 'not-applicable'
      : options.isRecovered
        ? 'passed'
        : 'not-required',
    durationMs: trials.reduce((total, trial) => total + trial.durationMs, 0),
    trials,
    failures: options.hasSkippedInitialJudge ? (trials[0]?.failures ?? []) : [],
    reuse: null,
  };
  const failedCompanionTrials = [
    createTrialResult(FAILED_CASE_ID, 'initial', false),
    createTrialResult(FAILED_CASE_ID, 'confirmation-1', false),
  ];
  const failedCompanionCase: IQualificationAttemptResult['cases'][number] = {
    caseId: FAILED_CASE_ID,
    title: FAILED_CASE_TITLE,
    status: 'failed',
    confirmationStatus: 'rejected',
    durationMs: failedCompanionTrials.reduce((total, trial) => total + trial.durationMs, 0),
    trials: failedCompanionTrials,
    failures: failedCompanionTrials.at(-1)?.failures ?? [],
    reuse: null,
  };
  const caseFixtures = [
    {
      caseId: CASE_ID,
      caseResult,
      hasSkippedInitialJudge: options.hasSkippedInitialJudge === true,
      trials,
    },
    ...(options.hasFailedCompanionCase === true
      ? [
          {
            caseId: FAILED_CASE_ID,
            caseResult: failedCompanionCase,
            hasSkippedInitialJudge: false,
            trials: failedCompanionTrials,
          },
        ]
      : []),
  ];
  const actorStageIdentity = '1'.repeat(64);
  const judgeStageIdentity = '2'.repeat(64);
  const stageIds = createQualificationStageIds(caseFixtures.map(({ caseId }) => caseId));
  const result = QualificationAttemptResultSchema.parse({
    protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    confirmationPolicy: QUALIFICATION_CONFIRMATION_POLICY,
    mode: 'official',
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status:
      options.hasFailedCompanionCase === true || options.hasSkippedInitialJudge === true
        ? 'failed'
        : 'passed',
    createdAt: CREATED_AT,
    completedAt: COMPLETED_AT,
    evidenceGeneratedAt: ACTOR_CREATED_AT,
    summary:
      options.hasFailedCompanionCase === true
        ? 'Qualification completed with one confirmed failure.'
        : options.hasSkippedInitialJudge
          ? 'Qualification completed with one terminal non-semantic failure.'
          : options.isRecovered
            ? 'Qualification recovered.'
            : 'Qualification passed.',
    provenance: {
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
      candidateFingerprint: options.candidateFingerprint ?? 'f'.repeat(64),
      packagesRepositoryCommit: options.packagesRepositoryCommit ?? 'packages-commit',
      packagesRepositoryFingerprint: options.packagesRepositoryFingerprint ?? 'a'.repeat(64),
      packagesRepositoryDirty: false,
      qualificationRepositoryCommit: options.qualificationRepositoryCommit ?? 'd'.repeat(40),
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: options.skillRepositoryCommit ?? 'skill-commit',
      skillRepositoryFingerprint: options.skillRepositoryFingerprint ?? 'b'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest,
      qualificationDigest: options.qualificationDigest ?? 'd'.repeat(64),
      targetDigest: options.targetDigest ?? 'e'.repeat(64),
      baselineAttemptId: null,
      packages: options.packages ?? [],
    },
    stages: stageIds.map((stageId) => {
      const caseFixture = caseFixtures.find(({ caseId }) => stageId.startsWith(`case:${caseId}:`));
      const trialId = QUALIFICATION_TRIAL_IDS.find((candidateTrialId) =>
        stageId.includes(`:trial:${candidateTrialId}:`),
      );
      const isSkipped =
        trialId !== undefined && !caseFixture?.trials.some((trial) => trial.trialId === trialId);
      const isSkippedJudge =
        caseFixture?.hasSkippedInitialJudge === true &&
        stageId === `case:${caseFixture.caseId}:trial:initial:judge`;
      const isFailedAssertion =
        caseFixture?.hasSkippedInitialJudge === true &&
        stageId === `case:${caseFixture.caseId}:trial:initial:assertions`;
      const stageIdentity = stageId.endsWith(':actor')
        ? actorStageIdentity
        : stageId.endsWith(':judge') && !isSkippedJudge
          ? judgeStageIdentity
          : null;
      const operationalRetries =
        options.hasOperationalRetry && stageId === `case:${CASE_ID}:trial:initial:actor`
          ? [
              {
                category: 'timed-out' as const,
                failedAt: '2026-08-20T10:00:05.000Z',
                failureCount: 1,
                retryDelayMs: 5_000,
              },
            ]
          : [];
      return createStage(
        stageId,
        isSkipped || isSkippedJudge ? 'skipped' : isFailedAssertion ? 'failed' : 'passed',
        isSkipped || isSkippedJudge ? null : stageIdentity,
        operationalRetries,
      );
    }),
    cases: caseFixtures.map(({ caseResult: fixtureCaseResult }) => fixtureCaseResult),
    artifactDigests: {},
  });

  const trialWrites = caseFixtures.flatMap(({ caseId, hasSkippedInitialJudge, trials }) =>
    trials.flatMap((trial) => {
      const trialRoot = path.join(
        options.artifactDirectory,
        'cases',
        caseId,
        'trials',
        trial.trialId,
      );
      const isJudgeSkipped = trial.trialId === 'initial' && hasSkippedInitialJudge;
      const trialActorOutput = isJudgeSkipped
        ? { ...actorOutput, changedFiles: ['unexpected.md'] }
        : actorOutput;
      const trialWorkspaceAssertions = isJudgeSkipped
        ? failedWorkspaceAssertions
        : workspaceAssertions;
      const judgeOutput = trial.passed ? passingJudgeOutput : failingJudgeOutput;
      const judgeWrites = isJudgeSkipped
        ? [
            writeJsonFileAtomically(path.join(trialRoot, 'judge-skipped.json'), {
              kind: 'deterministic-failure',
              reason: 'The judge was skipped because runner-owned evidence already failed.',
              deterministicAfterPassed: true,
              workspaceAssertionsPassed: false,
            }),
          ]
        : [
            writeJsonFileAtomically(path.join(trialRoot, 'judge-output.json'), judgeOutput),
            writeJsonFileAtomically(path.join(trialRoot, 'judge-evidence.json'), {
              role: 'judge',
              trialId: trial.trialId,
              createdAt: JUDGE_CREATED_AT,
              durationMs: 1,
              usage: MODEL_USAGE,
              stageIdentity: judgeStageIdentity,
              sourceAttemptId: options.attemptId,
              reuseSourceAttemptId: null,
              commandPolicy: EMPTY_COMMAND_POLICY,
            }),
            writeTextFileAtomically(path.join(trialRoot, 'judge-events.jsonl'), ''),
            writeJsonFileAtomically(
              path.join(trialRoot, 'judge-output.schema.json'),
              z.toJSONSchema(JudgeOutputSchema),
            ),
            writeTextFileAtomically(path.join(trialRoot, 'judge-prompt.md'), 'Judge prompt.\n'),
          ];

      return [
        writeJsonFileAtomically(path.join(trialRoot, 'actor-output.json'), trialActorOutput),
        writeJsonFileAtomically(path.join(trialRoot, 'actor-evidence.json'), {
          role: 'actor',
          trialId: trial.trialId,
          createdAt: ACTOR_CREATED_AT,
          durationMs: 1,
          usage: MODEL_USAGE,
          stageIdentity: actorStageIdentity,
          sourceAttemptId: options.attemptId,
          reuseSourceAttemptId: null,
          commandPolicy: EMPTY_COMMAND_POLICY,
        }),
        writeTextFileAtomically(path.join(trialRoot, 'actor-events.jsonl'), ''),
        writeJsonFileAtomically(
          path.join(trialRoot, 'actor-output.schema.json'),
          z.toJSONSchema(ActorOutputSchema),
        ),
        writeTextFileAtomically(
          path.join(trialRoot, 'actor-prompt.md'),
          buildActorPrompt({ task: '# Release case\n\nInspect the current evidence.' }),
        ),
        writeJsonFileAtomically(
          path.join(trialRoot, 'deterministic-after.json'),
          deterministicArtifact,
        ),
        writeJsonFileAtomically(
          path.join(trialRoot, 'deterministic-before.json'),
          deterministicArtifact,
        ),
        ...judgeWrites,
        writeJsonFileAtomically(path.join(trialRoot, 'trial-result.json'), trial),
        writeJsonFileAtomically(
          path.join(trialRoot, 'workspace-assertions.json'),
          trialWorkspaceAssertions,
        ),
        writeTextFileAtomically(
          path.join(trialRoot, 'workspace.patch'),
          'Added moldea/runtimes/release-case.md.\n',
        ),
      ];
    }),
  );

  await Promise.all([
    writeJsonFileAtomically(path.join(options.artifactDirectory, 'baseline.json'), {
      required: false,
      passed: true,
      status: 'not-required',
      baselineAttemptId: null,
      failures: [],
    }),
    writeJsonFileAtomically(path.join(options.artifactDirectory, 'coverage.json'), {
      passed: true,
      requiredClaims: [CLAIM_ID],
      declaredClaims: [CLAIM_ID],
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    }),
    writeJsonFileAtomically(path.join(options.artifactDirectory, 'source-state.json'), {
      passed: true,
      requiresCleanInputs: true,
      isExecutionHostTrusted: true,
      packagesRepositoryDirty: false,
      qualificationRepositoryDirty: false,
      skillRepositoryDirty: false,
      failures: [],
    }),
    ...caseFixtures.map(({ caseId, caseResult: fixtureCaseResult }) =>
      writeJsonFileAtomically(
        path.join(options.artifactDirectory, 'cases', caseId, 'case-result.json'),
        fixtureCaseResult,
      ),
    ),
    ...trialWrites,
  ]);

  return result;
};
