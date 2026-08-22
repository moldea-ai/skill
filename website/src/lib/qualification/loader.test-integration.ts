// @vitest-environment node
// exercises the public loader against complete repository-shaped filesystem fixtures
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { loadQualificationWebsiteModel } from './loader.ts';

const SHA_A = 'a'.repeat(64);
const SHA_B = 'b'.repeat(64);
const temporaryRoots: string[] = [];

interface IAttemptFixture extends Record<string, unknown> {
  artifactDigests: Record<string, string>;
  cases: Array<Record<string, unknown>>;
}

const createTemporaryRoot = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-qualification-loader-'));
  temporaryRoots.push(root);
  return root;
};

const writeText = (root: string, relativePath: string, content: string): void => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
};

const writeJson = (root: string, relativePath: string, value: unknown): void => {
  writeText(root, relativePath, `${JSON.stringify(value, null, 2)}\n`);
};

const seedProfile = (root: string): void => {
  writeText(
    root,
    'qualification/cases/cases.yaml',
    `version: 1
cases:
  - id: evaluate-project
    title: Evaluate project
    layer: universal-baseline
    description: Inspect one project.
    challenge: Avoid unsupported edits.
  - id: provider-streaming
    title: Provider streaming
    layer: adapter-specific
    description: Exercise one provider-specific streaming path.
    challenge: Preserve the selected adapter's streaming behavior.
`,
  );
  writeText(
    root,
    'qualification/profiles/custom/custom/profile.yaml',
    `version: 1
adapterId: custom
implementationId: custom
title: Custom qualification
description: Exercises universal behavior.
probesFile: probes/claims.yaml
cases:
  - id: evaluate-project
    projectDirectory: projects/evaluate-project
    scenarioFile: scenario.yaml
`,
  );
  writeText(
    root,
    'qualification/profiles/custom/custom/probes/claims.yaml',
    `version: 1
adapterId: custom
implementationId: custom
probes:
  - id: support-gate
    kind: support-gate
    matrixPath: qualification.support-gate
    description: Requires the complete gate.
    coveredBy:
      - evaluate-project
`,
  );
  writeText(
    root,
    'qualification/profiles/custom/custom/projects/evaluate-project/scenario.yaml',
    `version: 1
id: evaluate-project
title: Evaluate project
purpose: Confirm the project remains aligned.
taskFile: task.md
seedDirectory: seed
inspection:
  before: valid
  after: valid
deterministicEvidence:
  before:
    requiredDiagnosticCodes: []
    forbiddenDiagnosticCodes: []
    requiredEvidenceKinds: []
    forbiddenEvidenceKinds: []
  after:
    requiredDiagnosticCodes: []
    forbiddenDiagnosticCodes: []
    requiredEvidenceKinds: []
    forbiddenEvidenceKinds: []
expectedActorOutcome: completed
workspace:
  expectation: unchanged
  mustPreservePaths: []
  mustChangePaths: []
  mustExistPaths: []
  mustNotExistPaths: []
  allowedChangePaths: []
judgeRequirements:
  - id: validates-project
    description: The complete project remains valid.
`,
  );
  writeText(
    root,
    'qualification/profiles/custom/custom/projects/evaluate-project/task.md',
    '# Evaluate project\n\nInspect the project and leave it unchanged.\n',
  );
  writeText(
    root,
    'qualification/profiles/custom/custom/projects/evaluate-project/README.md',
    '# Evaluate project\n\nThis project catches unnecessary edits.\n',
  );
  writeText(root, 'qualification/results/README.md', '# Results\n');
};

const listArtifactPaths = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
    .flatMap((entry): string[] => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listArtifactPaths(path) : [path];
    });
};

const calculateDigest = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const createAttempt = (
  root: string,
  options: {
    attemptId: string;
    createdAt: string;
    judgeSkipped?: boolean;
    status: 'failed' | 'passed';
  },
): void => {
  const attemptDirectory = join(
    root,
    'qualification/results/custom/custom/attempts',
    options.attemptId,
  );
  const caseStatus = options.status === 'passed' ? 'passed' : 'failed';
  const isJudgeSkipped = options.judgeSkipped === true;
  const deterministic = {
    passed: true,
    inspectionStatus: 'valid',
    repositoryFilesystemValid: true,
    memoryRepositoryEquivalent: true,
    coreValid: true,
    cliCompatibilityValid: true,
    cliIdentityValid: true,
    cliPackageInventoryValid: true,
    cliAdapterInventoryValid: true,
    cliEnvelopeValid: true,
    cliValidateStatus: 'valid',
    cliInspectStatus: 'valid',
    typecheckPassed: true,
    repositoryUnchanged: true,
    failures: [],
    durationMs: 12,
    futureField: 'accepted',
  };
  const deterministicArtifact = {
    summary: deterministic,
    details: {
      futureField: 'accepted',
    },
  };
  const artifactValues: Record<string, unknown> = {
    'baseline.json': {
      required: false,
      passed: true,
      status: 'not-required',
      baselineAttemptId: null,
      failures: [],
    },
    'coverage.json': {
      passed: true,
      requiredClaims: ['qualification.support-gate'],
      declaredClaims: ['qualification.support-gate'],
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
      futureField: 'accepted',
    },
    'source-state.json': {
      passed: true,
      requiresCleanInputs: true,
      isExecutionHostTrusted: true,
      packagesRepositoryDirty: false,
      qualificationRepositoryDirty: false,
      skillRepositoryDirty: false,
      failures: [],
      futureField: 'accepted',
    },
    'cases/evaluate-project/actor-output.json': {
      outcome: 'completed',
      summary: 'The project is aligned.',
      commands: ['moldea validate'],
      changedFiles: [],
      observations: ['The project is valid.'],
      unresolved: [],
      futureField: 'accepted',
    },
    'cases/evaluate-project/deterministic-after.json': deterministicArtifact,
    'cases/evaluate-project/deterministic-before.json': deterministicArtifact,
    'cases/evaluate-project/judge-output.json': {
      verdict: caseStatus === 'passed' ? 'pass' : 'fail',
      summary: caseStatus === 'passed' ? 'Every requirement passed.' : 'One requirement failed.',
      requirements: [
        {
          id: 'validates-project',
          verdict: caseStatus === 'passed' ? 'pass' : 'fail',
          evidence: caseStatus === 'passed' ? 'Validation passed.' : 'Validation was incomplete.',
          futureField: 'accepted',
        },
      ],
      failures: caseStatus === 'passed' ? [] : ['Validation was incomplete.'],
      futureField: 'accepted',
    },
    'cases/evaluate-project/workspace-assertions.json': {
      passed: !isJudgeSkipped,
      failures: isJudgeSkipped ? ['Actor-reported changes did not match the workspace.'] : [],
      before: [],
      after: [],
      changedPaths: [],
      futureField: 'accepted',
    },
  };

  if (isJudgeSkipped) {
    delete artifactValues['cases/evaluate-project/judge-output.json'];
    artifactValues['cases/evaluate-project/judge-skipped.json'] = {
      reason:
        'The judge was skipped because deterministic postchecks or workspace assertions already failed.',
      deterministicAfterPassed: true,
      workspaceAssertionsPassed: false,
    };
  }

  for (const [artifactPath, value] of Object.entries(artifactValues)) {
    writeJson(attemptDirectory, artifactPath, value);
  }
  writeText(attemptDirectory, 'cases/evaluate-project/workspace.patch', '');

  const artifactDigests = Object.fromEntries(
    listArtifactPaths(attemptDirectory).map((path) => [
      relative(attemptDirectory, path).replaceAll(sep, '/'),
      calculateDigest(path),
    ]),
  );
  writeJson(attemptDirectory, 'attempt.json', {
    protocolVersion: 3,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status: options.status,
    createdAt: options.createdAt,
    completedAt: options.createdAt,
    evidenceGeneratedAt: options.createdAt,
    summary: options.status === 'passed' ? 'Qualification passed.' : 'Qualification failed.',
    provenance: {
      model: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
      codexVersion: '1.0.0',
      nodeVersion: '24.15.0',
      pnpmVersion: '11.9.0',
      gitVersion: '2.50.0',
      allowedEgressHosts: ['api.openai.com', 'auth.openai.com', 'chatgpt.com'],
      hostTimeoutMs: 120000,
      modelEndpoint: null,
      sslCertificateFileSha256: null,
      packagesRepositoryCommit: 'packages-commit',
      packagesRepositoryFingerprint: SHA_A,
      packagesRepositoryDirty: false,
      qualificationRepositoryCommit: 'qualification-commit',
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: SHA_B,
      skillRepositoryDirty: false,
      profileDigest: SHA_A,
      qualificationDigest: SHA_B,
      targetDigest: SHA_A,
      baselineAttemptId: null,
      packages: [
        {
          name: '@moldea.ai/cli',
          version: '4.0.0',
          registryIntegrity: `sha512-${'c'.repeat(86)}`,
          registryShasum: 'd'.repeat(40),
          registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-4.0.0.tgz',
          tarballName: 'cli-4.0.0.tgz',
          sha256: SHA_A,
          futureField: 'accepted',
        },
      ],
      futureField: 'accepted',
    },
    stages: [
      'source-state',
      'coverage',
      'candidate',
      'baseline',
      'case:evaluate-project:prepare',
      'case:evaluate-project:deterministic-before',
      'case:evaluate-project:actor',
      'case:evaluate-project:deterministic-after',
      'case:evaluate-project:assertions',
      'case:evaluate-project:judge',
      'case:evaluate-project:result',
    ].map((id) => ({
      id,
      status: isJudgeSkipped && id.endsWith(':judge') ? 'skipped' : 'passed',
      startedAt: options.createdAt,
      completedAt: options.createdAt,
      durationMs: 5,
      cacheKey: null,
      cacheSourceAttemptId: null,
      error: null,
      futureField: 'accepted',
    })),
    cases: [
      {
        caseId: 'evaluate-project',
        title: 'Evaluate project',
        status: caseStatus,
        durationMs: 100,
        deterministicBeforePath: 'cases/evaluate-project/deterministic-before.json',
        deterministicAfterPath: 'cases/evaluate-project/deterministic-after.json',
        actorOutputPath: 'cases/evaluate-project/actor-output.json',
        judgeStatus: isJudgeSkipped ? 'skipped' : 'completed',
        judgeOutputPath: isJudgeSkipped ? null : 'cases/evaluate-project/judge-output.json',
        judgeSkippedPath: isJudgeSkipped ? 'cases/evaluate-project/judge-skipped.json' : null,
        workspaceAssertionsPath: 'cases/evaluate-project/workspace-assertions.json',
        patchPath: 'cases/evaluate-project/workspace.patch',
        actorUsage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 3 },
        judgeUsage: null,
        actorEvidenceCreatedAt: options.createdAt,
        judgeEvidenceCreatedAt: isJudgeSkipped ? null : options.createdAt,
        actorCacheSourceAttemptId: null,
        judgeCacheSourceAttemptId: null,
        failures: caseStatus === 'passed' ? [] : ['Validation was incomplete.'],
        futureField: 'accepted',
      },
    ],
    artifactDigests,
    futureField: 'accepted',
  });
};

const readAttemptFixture = (root: string, attemptId: string): IAttemptFixture => {
  const path = join(
    root,
    'qualification/results/custom/custom/attempts',
    attemptId,
    'attempt.json',
  );
  const value = JSON.parse(readFileSync(path, 'utf8')) as unknown;

  if (
    typeof value !== 'object' ||
    value === null ||
    !('artifactDigests' in value) ||
    typeof value.artifactDigests !== 'object' ||
    value.artifactDigests === null ||
    !('cases' in value) ||
    !Array.isArray(value.cases)
  ) {
    throw new Error('Invalid test attempt fixture.');
  }

  return value as IAttemptFixture;
};

const replaceAttemptArtifact = (
  root: string,
  attemptId: string,
  relativePath: string,
  value: unknown,
): void => {
  const attemptDirectory = join(root, 'qualification/results/custom/custom/attempts', attemptId);
  writeJson(attemptDirectory, relativePath, value);
  const attempt = readAttemptFixture(root, attemptId);
  attempt.artifactDigests[relativePath] = calculateDigest(join(attemptDirectory, relativePath));
  writeJson(attemptDirectory, 'attempt.json', attempt);
};

const writeLatest = (
  root: string,
  latestAttemptId: string,
  latestStatus: 'failed' | 'passed',
  lastPassingAttemptId: string | null,
): void => {
  writeJson(root, 'qualification/results/custom/custom/latest.json', {
    protocolVersion: 3,
    adapterId: 'custom',
    implementationId: 'custom',
    latestAttemptId,
    latestStatus,
    lastPassingAttemptId,
    updatedAt: '2026-08-20T12:00:00.000Z',
    futureField: 'accepted',
  });
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('loadQualificationWebsiteModel', () => {
  test('loads a profile without unrelated adapter-specific catalog cases', () => {
    const root = createTemporaryRoot();
    seedProfile(root);

    const model = loadQualificationWebsiteModel(root);

    expect(model.route).toBe('/qualification/');
    expect(model.profiles).toHaveLength(1);
    expect(model.profiles[0]).toMatchObject({
      adapterId: 'custom',
      attempts: [],
      cases: [{ id: 'evaluate-project' }],
      implementationId: 'custom',
      latest: null,
      title: 'Custom qualification',
    });
    expect(model.profiles[0]?.cases[0]).toMatchObject({
      id: 'evaluate-project',
      projectExplanation: 'This project catches unnecessary edits.',
      task: 'Inspect the project and leave it unchanged.',
    });
  });

  test('accepts additive producer fields and loads a complete passing history', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-pass',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'passed',
    });
    writeLatest(root, 'attempt-pass', 'passed', 'attempt-pass');

    const profile = loadQualificationWebsiteModel(root).profiles[0];

    expect(profile?.latest).toMatchObject({
      latestAttemptId: 'attempt-pass',
      latestStatus: 'passed',
      lastPassingAttemptId: 'attempt-pass',
    });
    expect(profile?.attempts).toHaveLength(1);
    expect(profile?.attempts[0]?.route).toBe('/qualification/custom/custom/attempts/attempt-pass/');
    expect(profile?.attempts[0]?.cases[0]).toMatchObject({
      actor: { outcome: 'completed' },
      deterministicAfter: { passed: true },
      judge: { verdict: 'pass' },
      workspaceAssertions: { passed: true },
    });
    expect(profile?.attempts[0]?.artifacts.length).toBeGreaterThan(8);
  });

  test('keeps a prior passing baseline when the latest attempt fails', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-pass',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'passed',
    });
    createAttempt(root, {
      attemptId: 'attempt-fail',
      createdAt: '2026-08-20T11:00:00.000Z',
      status: 'failed',
    });
    writeLatest(root, 'attempt-fail', 'failed', 'attempt-pass');

    const profile = loadQualificationWebsiteModel(root).profiles[0];

    expect(profile?.attempts.map(({ result }) => result.attemptId)).toStrictEqual([
      'attempt-pass',
      'attempt-fail',
    ]);
    expect(profile?.latest).toMatchObject({
      latestAttemptId: 'attempt-fail',
      latestStatus: 'failed',
      lastPassingAttemptId: 'attempt-pass',
    });
  });

  test('loads an explicit skipped judge after deterministic failure', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-skipped-judge',
      createdAt: '2026-08-20T11:00:00.000Z',
      judgeSkipped: true,
      status: 'failed',
    });
    writeLatest(root, 'attempt-skipped-judge', 'failed', null);

    const caseEvidence = loadQualificationWebsiteModel(root).profiles[0]?.attempts[0]?.cases[0];

    expect(caseEvidence).toMatchObject({
      judge: null,
      judgeSkipped: {
        deterministicAfterPassed: true,
        workspaceAssertionsPassed: false,
      },
    });
  });

  test('rejects a latest pointer that contradicts immutable history', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-pass',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'passed',
    });
    writeLatest(root, 'missing-attempt', 'failed', null);

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification latest pointer does not match attempt history.',
    );
  });

  test('rejects a tampered public artifact digest', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-pass',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'passed',
    });
    writeLatest(root, 'attempt-pass', 'passed', 'attempt-pass');
    writeText(
      root,
      'qualification/results/custom/custom/attempts/attempt-pass/coverage.json',
      '{"passed":false}\n',
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification artifact digest does not match: coverage.json',
    );
  });

  test('rejects a passing attempt whose digested semantic evidence contradicts its status', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-pass',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'passed',
    });
    writeLatest(root, 'attempt-pass', 'passed', 'attempt-pass');
    replaceAttemptArtifact(root, 'attempt-pass', 'cases/evaluate-project/judge-output.json', {
      verdict: 'fail',
      summary: 'The declared requirement failed.',
      requirements: [
        {
          id: 'validates-project',
          verdict: 'fail',
          evidence: 'Validation failed.',
        },
      ],
      failures: ['Validation failed.'],
    });

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Passing qualification case evaluate-project has contradictory evidence.',
    );
  });

  test('rejects a case artifact reference outside its case directory', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-pass',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'passed',
    });
    writeLatest(root, 'attempt-pass', 'passed', 'attempt-pass');
    const attempt = readAttemptFixture(root, 'attempt-pass');
    const caseResult = attempt.cases[0];

    if (!caseResult) throw new Error('Missing test case result.');
    caseResult['patchPath'] = 'coverage.json';
    writeJson(
      root,
      'qualification/results/custom/custom/attempts/attempt-pass/attempt.json',
      attempt,
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification case evaluate-project has invalid artifact references.',
    );
  });

  test('rejects a passing attempt with an incomplete stage history', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-pass',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'passed',
    });
    writeLatest(root, 'attempt-pass', 'passed', 'attempt-pass');
    const attempt = readAttemptFixture(root, 'attempt-pass');
    attempt['stages'] = [];
    writeJson(
      root,
      'qualification/results/custom/custom/attempts/attempt-pass/attempt.json',
      attempt,
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Passing qualification attempt attempt-pass is incomplete.',
    );
  });

  test('rejects a failed case without an actionable recorded failure', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    createAttempt(root, {
      attemptId: 'attempt-fail',
      createdAt: '2026-08-20T10:00:00.000Z',
      status: 'failed',
    });
    writeLatest(root, 'attempt-fail', 'failed', null);
    const attempt = readAttemptFixture(root, 'attempt-fail');
    const caseResult = attempt.cases[0];

    if (!caseResult) throw new Error('Missing test case result.');
    caseResult['failures'] = [];
    writeJson(
      root,
      'qualification/results/custom/custom/attempts/attempt-fail/attempt.json',
      attempt,
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Failed qualification case evaluate-project has no recorded failure.',
    );
  });

  test('rejects a profile with an unsupported qualification protocol', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    writeText(
      root,
      'qualification/profiles/custom/custom/profile.yaml',
      `version: 2
adapterId: custom
implementationId: custom
title: Custom qualification
description: Exercises universal behavior.
probesFile: probes/claims.yaml
cases:
  - id: evaluate-project
    projectDirectory: projects/evaluate-project
    scenarioFile: scenario.yaml
`,
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow('Invalid qualification YAML');
  });

  test('rejects result history without a committed profile', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    mkdirSync(join(root, 'qualification/results/orphan/target'), { recursive: true });

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification results have no committed profile: orphan/target',
    );
  });
});
