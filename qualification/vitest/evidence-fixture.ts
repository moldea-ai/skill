import path from 'node:path';
import { z } from 'zod';

import {
  ActorOutputSchema,
  JudgeOutputSchema,
  QualificationAttemptResultSchema,
  type IQualificationAttemptResult,
  type IQualificationProvenance,
} from '../src/contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  ensureDirectory,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../src/filesystem/index.ts';

const CASE_ID = 'release-case';
const CASE_TITLE = 'Release case';
const CREATED_AT = '2026-08-20T10:00:00.000Z';
const COMPLETED_AT = '2026-08-20T10:01:00.000Z';
const JUDGE_CREATED_AT = '2026-08-20T10:00:20.000Z';
const ACTOR_CREATED_AT = '2026-08-20T10:00:10.000Z';
const CLAIM_ID = 'qualification.support-gate';

const createStage = (
  id: string,
  cacheKey: string | null = null,
): IQualificationAttemptResult['stages'][number] => ({
  id,
  status: 'passed',
  startedAt: CREATED_AT,
  completedAt: COMPLETED_AT,
  durationMs: 1_000,
  cacheKey,
  cacheSourceAttemptId: null,
  error: null,
});

/** Seeds one complete passing Custom profile and its engine-verifiable public evidence. */
export const seedPassingQualificationEvidenceFixture = async (options: {
  artifactDirectory: string;
  attemptId: string;
  packages?: IQualificationProvenance['packages'];
  packagesRepositoryCommit?: string;
  packagesRepositoryFingerprint?: string;
  qualificationDigest?: string;
  resultsRoot: string;
  skillRepositoryCommit?: string;
  skillRepositoryFingerprint?: string;
  targetDigest?: string;
}): Promise<IQualificationAttemptResult> => {
  const profileDirectory = path.join(options.resultsRoot, '..', 'profiles', 'custom', 'custom');
  const projectDirectory = path.join(profileDirectory, 'projects', CASE_ID);
  await ensureDirectory(projectDirectory);
  await Promise.all([
    writeTextFileAtomically(
      path.join(profileDirectory, 'profile.yaml'),
      [
        'version: 1',
        'adapterId: custom',
        'implementationId: custom',
        'title: Custom qualification fixture',
        'description: Complete passing evidence fixture.',
        'probesFile: probes/claims.yaml',
        'cases:',
        `  - id: ${CASE_ID}`,
        `    projectDirectory: projects/${CASE_ID}`,
        '    scenarioFile: scenario.yaml',
        '',
      ].join('\n'),
    ),
    writeTextFileAtomically(
      path.join(profileDirectory, 'probes', 'claims.yaml'),
      [
        'version: 1',
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
        'version: 1',
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
        '',
      ].join('\n'),
    ),
  ]);

  const profileDigest = await calculateDirectoryFingerprint(profileDirectory);
  const actorOutput = {
    outcome: 'completed' as const,
    summary: 'Created grounded runtime guidance for the fixture.',
    commands: [],
    changedFiles: ['moldea/runtimes/release-case.md'],
    observations: ['The runtime guidance is referenced by the fixture manifest.'],
    unresolved: [],
  };
  const judgeOutput = {
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
  const deterministicArtifact = {
    summary: {
      passed: true,
      inspectionStatus: 'valid' as const,
      repositoryFilesystemValid: true,
      memoryRepositoryEquivalent: true,
      coreValid: true,
      cliCompatibilityValid: true,
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
      cliCompatibility: {},
      cliValidate: {},
      cliInspect: {},
      typecheck: {
        exitCode: 0,
        stdout: '',
        stderr: '',
      },
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
  const actorCacheKey = '1'.repeat(64);
  const judgeCacheKey = '2'.repeat(64);
  const caseRoot = `cases/${CASE_ID}`;
  const caseResult: IQualificationAttemptResult['cases'][number] = {
    caseId: CASE_ID,
    title: CASE_TITLE,
    status: 'passed',
    durationMs: 1_000,
    deterministicBeforePath: `${caseRoot}/deterministic-before.json`,
    deterministicAfterPath: `${caseRoot}/deterministic-after.json`,
    actorOutputPath: `${caseRoot}/actor-output.json`,
    judgeStatus: 'completed',
    judgeOutputPath: `${caseRoot}/judge-output.json`,
    judgeSkippedPath: null,
    workspaceAssertionsPath: `${caseRoot}/workspace-assertions.json`,
    patchPath: `${caseRoot}/workspace.patch`,
    actorUsage: null,
    judgeUsage: null,
    actorEvidenceCreatedAt: ACTOR_CREATED_AT,
    judgeEvidenceCreatedAt: JUDGE_CREATED_AT,
    actorCacheSourceAttemptId: null,
    judgeCacheSourceAttemptId: null,
    failures: [],
  };
  const stageIds = [
    'source-state',
    'coverage',
    'candidate',
    'baseline',
    `case:${CASE_ID}:prepare`,
    `case:${CASE_ID}:deterministic-before`,
    `case:${CASE_ID}:actor`,
    `case:${CASE_ID}:deterministic-after`,
    `case:${CASE_ID}:assertions`,
    `case:${CASE_ID}:judge`,
    `case:${CASE_ID}:result`,
  ];
  const result = QualificationAttemptResultSchema.parse({
    protocolVersion: 4,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status: 'passed',
    createdAt: CREATED_AT,
    completedAt: COMPLETED_AT,
    evidenceGeneratedAt: ACTOR_CREATED_AT,
    summary: 'Qualification passed.',
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
      qualificationRepositoryCommit: 'qualification-commit',
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
    stages: stageIds.map((stageId) =>
      createStage(
        stageId,
        stageId.endsWith(':actor')
          ? actorCacheKey
          : stageId.endsWith(':judge')
            ? judgeCacheKey
            : null,
      ),
    ),
    cases: [caseResult],
    artifactDigests: {},
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
      path.join(options.artifactDirectory, caseRoot, 'actor-output.json'),
      actorOutput,
    ),
    writeJsonFileAtomically(path.join(options.artifactDirectory, caseRoot, 'actor-evidence.json'), {
      role: 'actor',
      createdAt: ACTOR_CREATED_AT,
      durationMs: 1,
      usage: null,
      cacheKey: actorCacheKey,
      sourceAttemptId: options.attemptId,
      cacheSourceAttemptId: null,
    }),
    writeTextFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'actor-events.jsonl'),
      '',
    ),
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'actor-output.schema.json'),
      z.toJSONSchema(ActorOutputSchema),
    ),
    writeTextFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'actor-prompt.md'),
      'Actor prompt.\n',
    ),
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'case-result.json'),
      caseResult,
    ),
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'deterministic-after.json'),
      deterministicArtifact,
    ),
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'deterministic-before.json'),
      deterministicArtifact,
    ),
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'judge-output.json'),
      judgeOutput,
    ),
    writeJsonFileAtomically(path.join(options.artifactDirectory, caseRoot, 'judge-evidence.json'), {
      role: 'judge',
      createdAt: JUDGE_CREATED_AT,
      durationMs: 1,
      usage: null,
      cacheKey: judgeCacheKey,
      sourceAttemptId: options.attemptId,
      cacheSourceAttemptId: null,
    }),
    writeTextFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'judge-events.jsonl'),
      '',
    ),
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'judge-output.schema.json'),
      z.toJSONSchema(JudgeOutputSchema),
    ),
    writeTextFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'judge-prompt.md'),
      'Judge prompt.\n',
    ),
    writeJsonFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'workspace-assertions.json'),
      workspaceAssertions,
    ),
    writeTextFileAtomically(
      path.join(options.artifactDirectory, caseRoot, 'workspace.patch'),
      'Added moldea/runtimes/release-case.md.\n',
    ),
  ]);

  return result;
};
