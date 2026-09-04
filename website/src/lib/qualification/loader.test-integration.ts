// @vitest-environment node
// exercises the public loader against complete repository-shaped filesystem fixtures
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, test } from 'vitest';
import { parse as parseYaml } from 'yaml';

import { recordQualificationResult } from '../../../../qualification/src/result/index.ts';
import { buildActorPrompt } from '../../../../qualification/src/prompts/index.ts';
import {
  createQualificationAttemptKey,
  QualificationAttemptStorageSchema,
  resolveQualificationArtifactPath,
} from '../../../../qualification/src/storage/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../../../qualification/vitest/evidence-fixture.ts';

import { assertPublishableQualificationEvidence, loadQualificationWebsiteModel } from './loader.ts';

const SHA_A = 'a'.repeat(64);
const TARGET_KEY = 't1';
const temporaryRoots: string[] = [];
const canonicalRepositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

interface IAttemptFixture extends Record<string, unknown> {
  artifactDigests: Record<string, string>;
  cases: Array<Record<string, unknown>>;
  stages: Array<Record<string, unknown>>;
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
    `version: 2
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
    'qualification/profiles/index.yaml',
    `version: 1
targets:
  - key: t1
    adapterId: custom
    implementationId: custom
`,
  );
  writeText(
    root,
    'qualification/profiles/t1/profile.yaml',
    `version: 2
adapterId: custom
implementationId: custom
title: Custom qualification
description: Exercises universal behavior.
probesFile: probes/claims.yaml
cases:
  - id: evaluate-project
    projectDirectory: cases/c1
    scenarioFile: scenario.yaml
`,
  );
  writeText(
    root,
    'qualification/profiles/t1/probes/claims.yaml',
    `version: 2
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
    'qualification/profiles/t1/cases/c1/scenario.yaml',
    `version: 2
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
    evaluation:
      kind: judge
      evidenceSources:
        - current-workspace
`,
  );
  writeText(
    root,
    'qualification/profiles/t1/cases/c1/task.md',
    '# Evaluate project\n\nInspect the project and leave it unchanged.\n',
  );
  writeText(
    root,
    'qualification/profiles/t1/cases/c1/README.md',
    '# Evaluate project\n\nThis project catches unnecessary edits.\n',
  );
};

const calculateDigest = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const getAttemptDirectory = (root: string, attemptId: string): string =>
  join(
    root,
    'qualification/results',
    TARGET_KEY,
    'attempts',
    createQualificationAttemptKey(attemptId),
  );

const getArtifactPath = (root: string, attemptId: string, logicalPath: string): string => {
  const attemptDirectory = getAttemptDirectory(root, attemptId);
  const storage = QualificationAttemptStorageSchema.parse(
    JSON.parse(readFileSync(join(attemptDirectory, 'storage.json'), 'utf8')) as unknown,
  );
  return resolveQualificationArtifactPath(attemptDirectory, storage, logicalPath);
};

const readAttemptFixture = (root: string, attemptId: string): IAttemptFixture => {
  const path = join(getAttemptDirectory(root, attemptId), 'attempt.json');
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

const writeAttemptFixture = (root: string, attemptId: string, attempt: IAttemptFixture): void => {
  const attemptDirectory = getAttemptDirectory(root, attemptId);
  const attemptPath = join(attemptDirectory, 'attempt.json');
  writeJson(attemptDirectory, 'attempt.json', attempt);
  const storagePath = join(attemptDirectory, 'storage.json');
  const storage = QualificationAttemptStorageSchema.parse(
    JSON.parse(readFileSync(storagePath, 'utf8')) as unknown,
  );
  const provenance = attempt['provenance'];

  if (
    typeof provenance !== 'object' ||
    provenance === null ||
    typeof (provenance as Record<string, unknown>)['qualificationRepositoryCommit'] !== 'string'
  ) {
    throw new Error('Missing qualification provenance fixture.');
  }

  writeJson(attemptDirectory, 'storage.json', {
    ...storage,
    attemptDigest: calculateDigest(attemptPath),
    sourceCommit: (provenance as Record<string, string>)['qualificationRepositoryCommit'],
    artifacts: storage.artifacts.map((artifact) => ({
      ...artifact,
      sha256: attempt.artifactDigests[artifact.logicalPath] ?? artifact.sha256,
    })),
  });
};

const replaceAttemptArtifact = (
  root: string,
  attemptId: string,
  relativePath: string,
  value: unknown,
): void => {
  const artifactPath = getArtifactPath(root, attemptId, relativePath);
  writeJson(dirname(artifactPath), basename(artifactPath), value);
  const attempt = readAttemptFixture(root, attemptId);
  attempt.artifactDigests[relativePath] = calculateDigest(artifactPath);
  writeAttemptFixture(root, attemptId, attempt);
};

const replaceAttemptTextArtifact = (
  root: string,
  attemptId: string,
  relativePath: string,
  content: string,
): void => {
  const artifactPath = getArtifactPath(root, attemptId, relativePath);
  writeText(dirname(artifactPath), basename(artifactPath), content);
  const attempt = readAttemptFixture(root, attemptId);
  attempt.artifactDigests[relativePath] = calculateDigest(artifactPath);
  writeAttemptFixture(root, attemptId, attempt);
};

const seedCurrentQualificationAttempt = async (
  root: string,
  attemptId: string,
  hasSkippedInitialJudge = false,
): Promise<void> => {
  const resultsRoot = join(root, 'qualification', 'results');
  const artifactDirectory = join(root, `.qualification-artifacts-${attemptId}`);
  writeText(
    root,
    'qualification/profiles/t1/cases/c1/task.md',
    '# Release case\n\nInspect the current evidence.\n',
  );
  writeText(
    root,
    'qualification/profiles/t1/cases/c1/README.md',
    '# Release case\n\nThis fixture exercises protocol 7 evidence.\n',
  );
  writeText(
    root,
    'qualification/cases/cases.yaml',
    `version: 2
cases:
  - id: release-case
    title: Release case
    layer: universal-baseline
    description: Inspect complete current evidence.
    challenge: Preserve every confirmation trial.
`,
  );
  const result = await seedPassingQualificationEvidenceFixture({
    artifactDirectory,
    attemptId,
    hasOperationalRetry: true,
    hasSkippedInitialJudge,
    isRecovered: true,
    packages: [
      {
        name: '@moldea.ai/cli',
        version: '6.0.0',
        registryIntegrity: `sha512-${'c'.repeat(86)}`,
        registryShasum: 'd'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-6.0.0.tgz',
        tarballName: 'cli-6.0.0.tgz',
        sha256: SHA_A,
      },
    ],
    resultsRoot,
  });
  await recordQualificationResult(
    {
      artifactDirectory,
      result,
      sanitizationContext: {
        attemptDirectory: '/attempt',
        packagesRepository: '/packages',
        skillRepository: '/repositories/skill',
      },
    },
    resultsRoot,
  );
};

const convertCurrentAttemptToActorPolicyFailure = (root: string, attemptId: string): void => {
  const failure =
    'Actor command policy observed prohibited credential, network, or sensitive evaluator access.';
  const attempt = readAttemptFixture(root, attemptId);
  const caseResult = attempt.cases[0];
  const trials = caseResult?.['trials'];

  if (
    !caseResult ||
    !Array.isArray(trials) ||
    typeof trials[0] !== 'object' ||
    trials[0] === null
  ) {
    throw new Error('Missing current initial fixture.');
  }

  const initialTrial = trials[0] as Record<string, unknown>;
  initialTrial['failures'] = [failure];
  const initialRoot = 'cases/release-case/trials/initial';
  const confirmationRoot = 'cases/release-case/trials/confirmation-1';
  const actorEvidencePath = `${initialRoot}/actor-evidence.json`;
  const actorEvidence = JSON.parse(
    readFileSync(getArtifactPath(root, attemptId, actorEvidencePath), 'utf8'),
  ) as {
    commandPolicy: {
      completedCommandCount: number;
      sensitiveAccess: Record<string, unknown>;
    };
  };
  actorEvidence.commandPolicy.completedCommandCount = 1;
  actorEvidence.commandPolicy.sensitiveAccess = {
    status: 'observed',
    observedCount: 1,
    indeterminateCount: 0,
  };
  replaceAttemptArtifact(root, attemptId, actorEvidencePath, actorEvidence);
  replaceAttemptTextArtifact(
    root,
    attemptId,
    `${initialRoot}/actor-events.jsonl`,
    `${JSON.stringify({
      eventType: 'command.completed',
      exitCode: 0,
      moldeaCommandCount: 0,
      outputByteCount: 1,
      status: 'completed',
    })}\n`,
  );

  for (const artifactName of ['actor-output.json', 'workspace-assertions.json'] as const) {
    const passingArtifact = JSON.parse(
      readFileSync(getArtifactPath(root, attemptId, `${confirmationRoot}/${artifactName}`), 'utf8'),
    ) as unknown;
    replaceAttemptArtifact(root, attemptId, `${initialRoot}/${artifactName}`, passingArtifact);
  }

  replaceAttemptArtifact(root, attemptId, `${initialRoot}/judge-skipped.json`, {
    kind: 'deterministic-failure',
    reason: 'The judge was skipped because runner-owned evidence already failed.',
    deterministicAfterPassed: true,
    workspaceAssertionsPassed: true,
  });
  replaceAttemptArtifact(root, attemptId, `${initialRoot}/trial-result.json`, initialTrial);
  replaceAttemptArtifact(root, attemptId, 'cases/release-case/case-result.json', caseResult);

  const updatedAttempt = readAttemptFixture(root, attemptId);
  const assertionsStage = updatedAttempt.stages.find(
    ({ id }) => id === 'case:release-case:trial:initial:assertions',
  );

  if (assertionsStage === undefined) {
    throw new Error('Missing current initial assertions stage.');
  }

  assertionsStage['status'] = 'passed';
  updatedAttempt.cases = [caseResult];
  writeAttemptFixture(root, attemptId, updatedAttempt);
};

const convertCurrentAttemptToFailed = (root: string, attemptId: string): void => {
  const failures = ['Requirement complete-evidence failed: Fixture failure.', 'Fixture failure.'];
  const attempt = readAttemptFixture(root, attemptId);
  const caseResult = attempt.cases[0];
  const trials = caseResult?.['trials'];

  if (
    !caseResult ||
    !Array.isArray(trials) ||
    typeof trials[2] !== 'object' ||
    trials[2] === null
  ) {
    throw new Error('Missing current confirmation fixture.');
  }

  const terminalTrial = trials[2] as Record<string, unknown>;
  terminalTrial['passed'] = false;
  terminalTrial['requirementAssessments'] = [
    {
      id: 'complete-evidence',
      evaluator: 'judge',
      verdict: 'fail',
      evidence: 'Fixture failure.',
    },
  ];
  terminalTrial['failures'] = failures;
  caseResult['status'] = 'failed';
  caseResult['confirmationStatus'] = 'rejected';
  caseResult['failures'] = failures;
  replaceAttemptArtifact(
    root,
    attemptId,
    'cases/release-case/trials/confirmation-2/judge-output.json',
    {
      verdict: 'fail',
      summary: 'The confirmation failed.',
      requirements: [
        {
          id: 'complete-evidence',
          verdict: 'fail',
          evidence: 'Fixture failure.',
        },
      ],
      failures: ['Fixture failure.'],
    },
  );
  replaceAttemptArtifact(
    root,
    attemptId,
    'cases/release-case/trials/confirmation-2/trial-result.json',
    terminalTrial,
  );
  replaceAttemptArtifact(root, attemptId, 'cases/release-case/case-result.json', caseResult);
  const updatedAttempt = readAttemptFixture(root, attemptId);
  updatedAttempt['status'] = 'failed';
  updatedAttempt.cases = attempt.cases;
  writeAttemptFixture(root, attemptId, updatedAttempt);
  writeJson(root, 'qualification/results/t1/latest.json', {
    protocolVersion: 7,
    adapterId: 'custom',
    implementationId: 'custom',
    latestAttemptId: attemptId,
    latestStatus: 'failed',
    lastPassingAttemptId: null,
    updatedAt: '2026-08-20T12:00:00.000Z',
  });
};

const convertCurrentAttemptToJudgePolicyFailure = (root: string, attemptId: string): void => {
  const failure =
    'Judge command policy observed prohibited credential, network, or sensitive evaluator access.';
  const attempt = readAttemptFixture(root, attemptId);
  const caseResult = attempt.cases[0];
  const trials = caseResult?.['trials'];

  if (
    !caseResult ||
    !Array.isArray(trials) ||
    typeof trials[2] !== 'object' ||
    trials[2] === null
  ) {
    throw new Error('Missing current confirmation fixture.');
  }

  const terminalTrial = trials[2] as Record<string, unknown>;
  terminalTrial['passed'] = false;
  terminalTrial['failures'] = [failure];
  caseResult['status'] = 'failed';
  caseResult['confirmationStatus'] = 'rejected';
  caseResult['failures'] = [failure];
  const judgeEvidencePath = 'cases/release-case/trials/confirmation-2/judge-evidence.json';
  const judgeEvidence = JSON.parse(
    readFileSync(getArtifactPath(root, attemptId, judgeEvidencePath), 'utf8'),
  ) as {
    commandPolicy: {
      completedCommandCount: number;
      sensitiveAccess: Record<string, unknown>;
    };
  };
  judgeEvidence.commandPolicy.completedCommandCount = 1;
  judgeEvidence.commandPolicy.sensitiveAccess = {
    status: 'observed',
    observedCount: 1,
    indeterminateCount: 0,
  };
  replaceAttemptArtifact(root, attemptId, judgeEvidencePath, judgeEvidence);
  replaceAttemptArtifact(
    root,
    attemptId,
    'cases/release-case/trials/confirmation-2/trial-result.json',
    terminalTrial,
  );
  replaceAttemptArtifact(root, attemptId, 'cases/release-case/case-result.json', caseResult);
  const updatedAttempt = readAttemptFixture(root, attemptId);
  updatedAttempt['status'] = 'failed';
  updatedAttempt.cases = attempt.cases;
  writeAttemptFixture(root, attemptId, updatedAttempt);
  writeJson(root, 'qualification/results/t1/latest.json', {
    protocolVersion: 7,
    adapterId: 'custom',
    implementationId: 'custom',
    latestAttemptId: attemptId,
    latestStatus: 'failed',
    lastPassingAttemptId: null,
    updatedAt: '2026-08-20T12:00:00.000Z',
  });
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('loadQualificationWebsiteModel', () => {
  test('loads current profiles with universal cases owned only by Custom', () => {
    const model = loadQualificationWebsiteModel(canonicalRepositoryRoot);
    const attempts = model.profiles.flatMap(({ attempts }) => attempts);
    const customProfile = model.profiles.find(
      ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
    );
    const caseCatalog = parseYaml(
      readFileSync(join(canonicalRepositoryRoot, 'qualification/cases/cases.yaml'), 'utf8'),
    ) as { cases: Array<{ id: string; layer: string }> };
    const universalCaseIds = new Set(
      caseCatalog.cases.filter(({ layer }) => layer === 'universal-baseline').map(({ id }) => id),
    );

    expect(model.profiles).toHaveLength(14);
    expect(attempts).toHaveLength(0);
    expect(customProfile?.cases.map(({ id }) => id)).toStrictEqual([...universalCaseIds]);
    expect(
      model.profiles
        .filter(({ adapterId }) => adapterId !== 'custom')
        .every(({ cases }) => cases.every(({ id }) => !universalCaseIds.has(id))),
    ).toBe(true);

    const serializedModel = JSON.stringify(model);
    expect(serializedModel).not.toContain(canonicalRepositoryRoot);
    expect(serializedModel).not.toContain('file://');
  });

  test('loads a profile without unrelated adapter-specific catalog cases', () => {
    const root = createTemporaryRoot();
    seedProfile(root);

    const model = loadQualificationWebsiteModel(root);

    expect(model.route).toBe('/evidence/qualification/');
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
    expect(() => assertPublishableQualificationEvidence(model)).not.toThrow();
  });

  test('loads and independently validates ordered recovered confirmation evidence', async () => {
    const root = createTemporaryRoot();
    const resultsRoot = join(root, 'qualification', 'results');
    const artifactDirectory = join(root, '.qualification-artifacts');
    writeText(
      root,
      'qualification/profiles/t1/cases/c1/task.md',
      '# Release case\n\nInspect the current evidence.\n',
    );
    writeText(
      root,
      'qualification/profiles/t1/cases/c1/README.md',
      '# Release case\n\nThis fixture exercises recovered protocol 7 evidence.\n',
    );
    const result = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-recovered',
      hasOperationalRetry: true,
      isRecovered: true,
      packages: [
        {
          name: '@moldea.ai/cli',
          version: '6.0.0',
          registryIntegrity: `sha512-${'c'.repeat(86)}`,
          registryShasum: 'd'.repeat(40),
          registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-6.0.0.tgz',
          tarballName: 'cli-6.0.0.tgz',
          sha256: SHA_A,
        },
      ],
      resultsRoot,
    });
    writeText(
      root,
      'qualification/cases/cases.yaml',
      `version: 2
cases:
  - id: release-case
    title: Release case
    layer: universal-baseline
    description: Inspect complete current evidence.
    challenge: Preserve every confirmation trial.
`,
    );
    await recordQualificationResult(
      {
        artifactDirectory,
        result,
        sanitizationContext: {
          attemptDirectory: '/attempt',
          packagesRepository: '/packages',
          skillRepository: '/repositories/skill',
        },
      },
      resultsRoot,
    );

    const model = loadQualificationWebsiteModel(root);
    const profile = model.profiles[0];
    const recoveredCase = profile?.currentLatest?.cases[0];

    expect(() => assertPublishableQualificationEvidence(model)).not.toThrow();
    expect(profile?.currentLatest?.result).toMatchObject({
      protocolVersion: 7,
      status: 'passed',
    });
    expect(recoveredCase?.result).toMatchObject({
      status: 'recovered',
      confirmationStatus: 'passed',
    });
    expect(recoveredCase?.trials[0]?.retries.actor).toStrictEqual([
      {
        category: 'timed-out',
        failedAt: '2026-08-20T10:00:05.000Z',
        failureCount: 1,
        retryDelayMs: 5_000,
      },
    ]);
    expect(
      recoveredCase?.trials.map(({ result: trial }) => ({
        trialId: trial.trialId,
        passed: trial.passed,
        actorCacheSourceAttemptId: trial.actorCacheSourceAttemptId,
        judgeCacheSourceAttemptId: trial.judgeCacheSourceAttemptId,
      })),
    ).toStrictEqual([
      {
        trialId: 'initial',
        passed: false,
        actorCacheSourceAttemptId: null,
        judgeCacheSourceAttemptId: null,
      },
      {
        trialId: 'confirmation-1',
        passed: true,
        actorCacheSourceAttemptId: null,
        judgeCacheSourceAttemptId: null,
      },
      {
        trialId: 'confirmation-2',
        passed: true,
        actorCacheSourceAttemptId: null,
        judgeCacheSourceAttemptId: null,
      },
    ]);

    const relativePath = 'cases/release-case/trials/initial/deterministic-after.json';
    const artifactPath = getArtifactPath(root, 'attempt-recovered', relativePath);
    const artifact = JSON.parse(readFileSync(artifactPath, 'utf8')) as {
      summary: { coreValid: boolean };
    };
    artifact.summary.coreValid = false;
    replaceAttemptArtifact(root, 'attempt-recovered', relativePath, artifact);

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification case has contradictory post-actor deterministic evidence.',
    );
  });

  test('replays the immutable developer task retained in the actor prompt', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-recorded-task';
    await seedCurrentQualificationAttempt(root, attemptId);
    replaceAttemptTextArtifact(
      root,
      attemptId,
      'cases/release-case/trials/initial/actor-prompt.md',
      buildActorPrompt({
        task: [
          '# Recorded task',
          '',
          'Use the developer task retained by this immutable attempt.',
          '',
          'Execution rules:',
          '',
          '- Keep this task-owned section in the replay.',
        ].join('\n'),
      }),
    );
    writeText(
      root,
      'qualification/profiles/t1/cases/c1/task.md',
      '# Current task\n\nThis newer profile text must not replace the recorded attempt task.\n',
    );

    const replay = loadQualificationWebsiteModel(root).profiles[0]?.currentLatest?.cases[0]?.replay;

    expect(replay?.trials[0]?.steps[0]).toStrictEqual({
      content: [
        'Use the developer task retained by this immutable attempt.',
        '',
        'Execution rules:',
        '',
        '- Keep this task-owned section in the replay.',
      ].join('\n'),
      kind: 'message',
      role: 'developer',
      source: 'recorded',
    });
  });

  test('loads a failed trial caused by judge command policy evidence', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-judge-policy-failure';
    await seedCurrentQualificationAttempt(root, attemptId);
    convertCurrentAttemptToJudgePolicyFailure(root, attemptId);

    expect(() => loadQualificationWebsiteModel(root)).not.toThrow();
  });

  test('loads a recovered trial whose judge was skipped after an actor policy failure', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-actor-policy-failure';
    await seedCurrentQualificationAttempt(root, attemptId, true);
    convertCurrentAttemptToActorPolicyFailure(root, attemptId);

    expect(() => loadQualificationWebsiteModel(root)).not.toThrow();
  });

  test('rejects a current actor prompt with altered execution rules', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-invalid-actor-prompt';
    const relativePath = 'cases/release-case/trials/initial/actor-prompt.md';
    await seedCurrentQualificationAttempt(root, attemptId);
    replaceAttemptTextArtifact(
      root,
      attemptId,
      relativePath,
      [
        'Complete the project task below in the current Git working tree:',
        '',
        '# Recorded task',
        '',
        'Execution rules:',
        '',
        '- Preserve unrelated files, but omit the remaining protocol safeguards.',
        '',
      ].join('\n'),
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      `Qualification actor prompt does not retain a recorded developer task: ${relativePath}`,
    );
  });

  test('rejects incomplete stage inventory in a current failed attempt', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-failed-stages';
    await seedCurrentQualificationAttempt(root, attemptId);
    convertCurrentAttemptToFailed(root, attemptId);
    expect(() => loadQualificationWebsiteModel(root)).not.toThrow();

    const attempt = readAttemptFixture(root, attemptId);
    attempt.stages = attempt.stages.filter(({ id }) => id !== 'case:release-case:result');
    writeAttemptFixture(root, attemptId, attempt);

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      `Failed qualification attempt ${attemptId} is incomplete.`,
    );
  });

  test('rejects a current attempt with a self-consistent but incomplete artifact inventory', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-missing-artifact';
    const relativePath = 'source-state.json';
    await seedCurrentQualificationAttempt(root, attemptId);
    const attempt = readAttemptFixture(root, attemptId);
    delete attempt.artifactDigests[relativePath];
    rmSync(getArtifactPath(root, attemptId, relativePath));
    writeAttemptFixture(root, attemptId, attempt);
    const attemptDirectory = getAttemptDirectory(root, attemptId);
    const storagePath = join(attemptDirectory, 'storage.json');
    const storage = QualificationAttemptStorageSchema.parse(
      JSON.parse(readFileSync(storagePath, 'utf8')) as unknown,
    );
    writeJson(attemptDirectory, 'storage.json', {
      ...storage,
      artifacts: storage.artifacts.filter(({ logicalPath }) => logicalPath !== relativePath),
    });

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification evidence has an incomplete protocol 7 artifact inventory.',
    );
  });

  test('rejects a current trial that contradicts its digested trial result artifact', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-trial-result';
    const relativePath = 'cases/release-case/trials/initial/trial-result.json';
    await seedCurrentQualificationAttempt(root, attemptId);
    const trialResultPath = getArtifactPath(root, attemptId, relativePath);
    const trialResult = JSON.parse(readFileSync(trialResultPath, 'utf8')) as Record<
      string,
      unknown
    >;
    trialResult['durationMs'] = Number(trialResult['durationMs']) + 1;
    replaceAttemptArtifact(root, attemptId, relativePath, trialResult);

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification case release-case trial initial contradicts trial-result.json.',
    );
  });

  test('rejects raw command text added to current projected execution evidence', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-raw-command';
    const relativePath = 'cases/release-case/trials/initial/actor-events.jsonl';
    await seedCurrentQualificationAttempt(root, attemptId);
    replaceAttemptTextArtifact(
      root,
      attemptId,
      relativePath,
      `${JSON.stringify({
        eventType: 'command.completed',
        exitCode: 0,
        moldeaCommandCount: 0,
        outputByteCount: 0,
        status: 'completed',
        command: 'moldea validate',
      })}\n`,
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow(/unrecognized_keys/u);
  });

  test('rejects current retry evidence outside the bounded backoff range', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-retry-delay';
    await seedCurrentQualificationAttempt(root, attemptId);
    const attempt = readAttemptFixture(root, attemptId);
    const actorStage = attempt.stages.find(
      ({ id }) => id === 'case:release-case:trial:initial:actor',
    );
    const operationalRetries = actorStage?.['operationalRetries'];

    if (!Array.isArray(operationalRetries) || typeof operationalRetries[0] !== 'object') {
      throw new Error('Missing operational retry fixture.');
    }

    (operationalRetries[0] as Record<string, unknown>)['retryDelayMs'] = 0;
    writeAttemptFixture(root, attemptId, attempt);

    expect(() => loadQualificationWebsiteModel(root)).toThrow('Invalid qualification JSON');
  });

  test('rejects an unsupported latest-pointer protocol', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-unsupported-pointer';
    await seedCurrentQualificationAttempt(root, attemptId);
    const latestPath = 'qualification/results/t1/latest.json';
    const latest = JSON.parse(readFileSync(join(root, latestPath), 'utf8')) as Record<
      string,
      unknown
    >;
    writeJson(root, latestPath, { ...latest, protocolVersion: 8 });

    expect(() => loadQualificationWebsiteModel(root)).toThrow('Invalid qualification JSON');
  });

  test('rejects a tampered current artifact digest', async () => {
    const root = createTemporaryRoot();
    const attemptId = 'attempt-tampered-artifact';
    await seedCurrentQualificationAttempt(root, attemptId);
    const coveragePath = getArtifactPath(root, attemptId, 'coverage.json');
    writeJson(dirname(coveragePath), basename(coveragePath), { passed: false });

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification artifact digest does not match: coverage.json',
    );
  });

  test('rejects a profile with an unsupported qualification protocol', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    writeText(
      root,
      'qualification/profiles/t1/profile.yaml',
      `version: 1
adapterId: custom
implementationId: custom
title: Custom qualification
description: Exercises universal behavior.
probesFile: probes/claims.yaml
cases:
  - id: evaluate-project
    projectDirectory: cases/c1
    scenarioFile: scenario.yaml
`,
    );

    expect(() => loadQualificationWebsiteModel(root)).toThrow('Invalid qualification YAML');
  });

  test('rejects result history without a committed profile', () => {
    const root = createTemporaryRoot();
    seedProfile(root);
    mkdirSync(join(root, 'qualification/results/t2'), { recursive: true });

    expect(() => loadQualificationWebsiteModel(root)).toThrow(
      'Qualification results have no committed profile: t2',
    );
  });
});
