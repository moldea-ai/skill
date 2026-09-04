// @vitest-environment node
import { expect, test } from 'vitest';

import type {
  IQualificationAttemptResult,
  IQualificationBaselineCheck,
  IQualificationCoverageResult,
  IQualificationSourceStateResult,
} from './types.ts';
import { assertQualificationAttemptEvidence } from './validations.ts';

const SHA_A = 'a'.repeat(64);

// complete official preflight evidence for an adapter attempt with no executed cases
const FAILED_BASELINE_RESULT = {
  protocolVersion: 7,
  confirmationPolicy: { version: 1, requiredPassingConfirmations: 2 },
  mode: 'official',
  attemptId: 'failed-baseline-attempt',
  parentAttemptId: null,
  selection: {
    adapterId: 'vercel-ai-sdk',
    implementationId: 'typescript-tool-loop-agent-7',
  },
  status: 'failed',
  createdAt: '2026-08-29T13:38:35.459Z',
  completedAt: '2026-08-29T13:38:45.268Z',
  evidenceGeneratedAt: null,
  summary: 'Qualification stopped because its Custom baseline is incompatible.',
  provenance: {
    model: 'gpt-5.6-sol',
    reasoningEffort: 'medium',
    codexVersion: 'codex-cli test',
    nodeVersion: 'v24.15.0',
    pnpmVersion: '11.9.0',
    gitVersion: 'git version test',
    allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
    hostTimeoutMs: 300_000,
    modelEndpoint: null,
    sslCertificateFileSha256: null,
    packagesRepositoryCommit: 'packages-commit',
    packagesRepositoryFingerprint: SHA_A,
    packagesRepositoryDirty: false,
    qualificationRepositoryCommit: 'qualification-commit',
    qualificationRepositoryDirty: false,
    skillRepositoryCommit: 'skill-commit',
    skillRepositoryFingerprint: SHA_A,
    skillRepositoryDirty: false,
    profileDigest: SHA_A,
    qualificationDigest: SHA_A,
    targetDigest: SHA_A,
    baselineAttemptId: null,
    packages: [
      {
        name: '@moldea.ai/adapter-vercel-ai-sdk',
        version: '1.0.2',
        registryIntegrity: `sha512-${'a'.repeat(86)}`,
        registryShasum: 'a'.repeat(40),
        registryTarballUrl:
          'https://registry.npmjs.org/@moldea.ai/adapter-vercel-ai-sdk/-/adapter-vercel-ai-sdk-1.0.2.tgz',
        tarballName: 'adapter-vercel-ai-sdk-1.0.2.tgz',
        sha256: SHA_A,
      },
    ],
  },
  stages: [
    {
      id: 'baseline',
      status: 'failed',
      startedAt: '2026-08-29T13:38:44.000Z',
      completedAt: '2026-08-29T13:38:45.000Z',
      durationMs: 1_000,
      cacheKey: null,
      cacheSourceAttemptId: null,
      error: null,
      operationalRetries: [],
    },
  ],
  cases: [],
  artifactDigests: {},
} satisfies IQualificationAttemptResult;

const INCOMPATIBLE_BASELINE = {
  required: true,
  passed: false,
  status: 'incompatible',
  baselineAttemptId: null,
  failures: ['The Custom baseline does not match the current qualification inputs.'],
} satisfies IQualificationBaselineCheck;

const PASSING_COVERAGE = {
  passed: true,
  requiredClaims: ['qualification.tool-loop-agent'],
  declaredClaims: ['qualification.tool-loop-agent'],
  missingClaims: [],
  unknownClaims: [],
  uncoveredCaseIds: [],
} satisfies IQualificationCoverageResult;

const PASSING_SOURCE_STATE = {
  passed: true,
  requiresCleanInputs: true,
  isExecutionHostTrusted: true,
  packagesRepositoryDirty: false,
  qualificationRepositoryDirty: false,
  skillRepositoryDirty: false,
  failures: [],
} satisfies IQualificationSourceStateResult;

test('accepts an incompatible baseline as failed preflight evidence', () => {
  expect(() =>
    assertQualificationAttemptEvidence({
      baseline: INCOMPATIBLE_BASELINE,
      coverage: PASSING_COVERAGE,
      error: null,
      errorArtifactKind: null,
      profileCaseIds: new Set(['repair-vercel-tool-registration']),
      probeMatrixPaths: ['qualification.tool-loop-agent'],
      result: FAILED_BASELINE_RESULT,
      sourceState: PASSING_SOURCE_STATE,
    }),
  ).not.toThrow();
});

test('rejects a failed attempt without failed preflight or case evidence', () => {
  expect(() =>
    assertQualificationAttemptEvidence({
      baseline: {
        required: true,
        passed: true,
        status: 'passed',
        baselineAttemptId: 'custom-baseline-attempt',
        failures: [],
      },
      coverage: PASSING_COVERAGE,
      error: null,
      errorArtifactKind: null,
      profileCaseIds: new Set(['repair-vercel-tool-registration']),
      probeMatrixPaths: ['qualification.tool-loop-agent'],
      result: FAILED_BASELINE_RESULT,
      sourceState: PASSING_SOURCE_STATE,
    }),
  ).toThrow('Failed qualification attempt failed-baseline-attempt has no failing evidence.');
});
