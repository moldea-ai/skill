import path from 'node:path';
import { z } from 'zod';

import {
  QUALIFICATION_CONFIRMATION_POLICY,
  QUALIFICATION_TRIAL_IDS,
} from '../src/constants/index.ts';
import {
  ActorOutputSchema,
  JudgeOutputSchema,
  QualificationAttemptResultSchema,
  QualificationTrialResultSchema,
  type IQualificationAttemptResult,
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
const CREATED_AT = '2026-08-20T10:00:00.000Z';
const COMPLETED_AT = '2026-08-20T10:01:00.000Z';
const JUDGE_CREATED_AT = '2026-08-20T10:00:20.000Z';
const ACTOR_CREATED_AT = '2026-08-20T10:00:10.000Z';
const CLAIM_ID = 'qualification.support-gate';
const WORKSPACE_FAILURE = 'Unexpected changed path unexpected.md.';
const EMPTY_COMMAND_POLICY = {
  completedCommandCount: 0,
  credentialExposure: { status: 'not-observed', observedCount: 0 },
  networkAccess: { status: 'not-observed', observedCount: 0, indeterminateCount: 0 },
  sensitiveAccess: { status: 'not-observed', observedCount: 0, indeterminateCount: 0 },
} as const;

const createStage = (
  id: string,
  status: IQualificationAttemptResult['stages'][number]['status'],
  cacheKey: string | null = null,
  operationalRetries: IQualificationAttemptResult['stages'][number]['operationalRetries'] = [],
): IQualificationAttemptResult['stages'][number] => ({
  id,
  status,
  startedAt: status === 'pending' ? null : CREATED_AT,
  completedAt: status === 'pending' ? null : COMPLETED_AT,
  durationMs: status === 'pending' ? null : status === 'skipped' ? 0 : 1_000,
  cacheKey,
  cacheSourceAttemptId: null,
  error: null,
  operationalRetries,
});

const createTrialResult = (
  trialId: IQualificationTrialResult['trialId'],
  passed: boolean,
  isJudgeSkipped = false,
): IQualificationTrialResult => {
  const trialRoot = `cases/${CASE_ID}/trials/${trialId}`;
  const confirmationIndex =
    trialId === 'initial' ? null : Number(trialId.slice('confirmation-'.length));

  return QualificationTrialResultSchema.parse({
    trialId,
    kind: trialId === 'initial' ? 'initial' : 'confirmation',
    confirmationIndex,
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
    actorUsage: null,
    judgeUsage: null,
    actorEvidenceCreatedAt: ACTOR_CREATED_AT,
    judgeEvidenceCreatedAt: isJudgeSkipped ? null : JUDGE_CREATED_AT,
    actorCacheSourceAttemptId: null,
    judgeCacheSourceAttemptId: null,
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

/** Seeds one complete protocol 6 Custom profile and its engine-verifiable public evidence. */
export const seedPassingQualificationEvidenceFixture = async (options: {
  artifactDirectory: string;
  attemptId: string;
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
  const profileDirectory = path.join(profilesRoot, 't1');
  const projectDirectory = path.join(profileDirectory, 'cases', 'c1');
  await ensureDirectory(projectDirectory);
  await Promise.all([
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
  const trials = options.isRecovered
    ? [
        createTrialResult('initial', false, options.hasSkippedInitialJudge),
        createTrialResult('confirmation-1', true),
        createTrialResult('confirmation-2', true),
      ]
    : [createTrialResult('initial', true)];
  const caseResult: IQualificationAttemptResult['cases'][number] = {
    caseId: CASE_ID,
    title: CASE_TITLE,
    status: options.isRecovered ? 'recovered' : 'passed',
    confirmationStatus: options.isRecovered ? 'passed' : 'not-required',
    durationMs: trials.reduce((total, trial) => total + trial.durationMs, 0),
    trials,
    failures: [],
  };
  const actorCacheKey = '1'.repeat(64);
  const judgeCacheKey = '2'.repeat(64);
  const stageIds = createQualificationStageIds([CASE_ID]);
  const executedTrialIds = new Set(trials.map(({ trialId }) => trialId));
  const result = QualificationAttemptResultSchema.parse({
    protocolVersion: 6,
    confirmationPolicy: QUALIFICATION_CONFIRMATION_POLICY,
    mode: 'official',
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status: 'passed',
    createdAt: CREATED_AT,
    completedAt: COMPLETED_AT,
    evidenceGeneratedAt: ACTOR_CREATED_AT,
    summary: options.isRecovered ? 'Qualification recovered.' : 'Qualification passed.',
    provenance: {
      model: 'gpt-5.6-sol',
      reasoningEffort: 'medium',
      codexVersion: 'codex-cli test',
      nodeVersion: process.version,
      pnpmVersion: '11.9.0',
      gitVersion: 'git version test',
      allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
      hostTimeoutMs: 120_000,
      modelEndpoint: null,
      sslCertificateFileSha256: null,
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
      const trialId = QUALIFICATION_TRIAL_IDS.find((candidateTrialId) =>
        stageId.includes(`:trial:${candidateTrialId}:`),
      );
      const isSkipped = trialId !== undefined && !executedTrialIds.has(trialId);
      const isSkippedJudge =
        options.hasSkippedInitialJudge && stageId === `case:${CASE_ID}:trial:initial:judge`;
      const isFailedAssertion =
        options.hasSkippedInitialJudge && stageId === `case:${CASE_ID}:trial:initial:assertions`;
      const cacheKey = stageId.endsWith(':actor')
        ? actorCacheKey
        : stageId.endsWith(':judge') && !isSkippedJudge
          ? judgeCacheKey
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
        isSkipped || isSkippedJudge ? null : cacheKey,
        operationalRetries,
      );
    }),
    cases: [caseResult],
    artifactDigests: {},
  });

  const trialWrites = trials.flatMap((trial) => {
    const trialRoot = path.join(
      options.artifactDirectory,
      'cases',
      CASE_ID,
      'trials',
      trial.trialId,
    );
    const isJudgeSkipped = trial.trialId === 'initial' && options.hasSkippedInitialJudge;
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
            usage: null,
            cacheKey: judgeCacheKey,
            sourceAttemptId: options.attemptId,
            cacheSourceAttemptId: null,
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
        usage: null,
        cacheKey: actorCacheKey,
        sourceAttemptId: options.attemptId,
        cacheSourceAttemptId: null,
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
  });

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
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, 'cases', CASE_ID, 'case-result.json'),
      caseResult,
    ),
    ...trialWrites,
  ]);

  return result;
};
