// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  QualificationAttemptResultDraftSchema,
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  QualificationModelStageEvidenceSchema,
  type IQualificationAttemptResult,
} from '../contracts/index.ts';
import { QUALIFICATION_CONFIRMATION_POLICY } from '../constants/index.ts';
import {
  calculateFileSha256,
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import {
  createQualificationAttemptKey,
  readQualificationAttemptStorage,
  resolveQualificationArtifactPath,
} from '../storage/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../vitest/evidence-fixture.ts';
import { recordQualificationResult, verifyQualificationResults } from './recorder.ts';

const TARGET_KEY = 't1';
const REPOSITORY_CUSTOM_TARGET_KEY = 't5';

const getRecordedAttemptDirectory = (
  resultsRoot: string,
  attemptId: string,
  targetKey: string = TARGET_KEY,
): string =>
  path.join(resultsRoot, targetKey, 'attempts', createQualificationAttemptKey(attemptId));

const getRecordedArtifactPath = async (
  resultsRoot: string,
  attemptId: string,
  logicalPath: string,
  targetKey: string = TARGET_KEY,
): Promise<string> => {
  const attemptDirectory = getRecordedAttemptDirectory(resultsRoot, attemptId, targetKey);
  const storage = await readQualificationAttemptStorage(attemptDirectory);

  return resolveQualificationArtifactPath(attemptDirectory, storage, logicalPath);
};

const synchronizeRecordedArtifactDigests = async (
  resultsRoot: string,
  attemptId: string,
  logicalPaths: readonly string[],
): Promise<void> => {
  const attemptDirectory = getRecordedAttemptDirectory(resultsRoot, attemptId);
  const attemptPath = path.join(attemptDirectory, 'attempt.json');
  const result = await readJsonFile(attemptPath, QualificationAttemptResultSchema);
  const storage = await readQualificationAttemptStorage(attemptDirectory);
  const artifactDigests = { ...result.artifactDigests };

  for (const logicalPath of logicalPaths) {
    artifactDigests[logicalPath] = await calculateFileSha256(
      resolveQualificationArtifactPath(attemptDirectory, storage, logicalPath),
    );
  }

  await writeJsonFileAtomically(attemptPath, { ...result, artifactDigests });
  await writeJsonFileAtomically(path.join(attemptDirectory, 'storage.json'), {
    ...storage,
    attemptDigest: await calculateFileSha256(attemptPath),
    artifacts: storage.artifacts.map((artifact) => ({
      ...artifact,
      sha256: artifactDigests[artifact.logicalPath],
    })),
  });
};

const sanitizationContext = {
  attemptDirectory: '/attempt',
  packagesRepository: '/packages',
  skillRepository: '/skill',
};

const createResult = (
  attemptId: string,
  createdAt: string,
  status: 'errored' | 'failed' | 'incomplete' | 'passed',
): IQualificationAttemptResult =>
  QualificationAttemptResultSchema.parse({
    protocolVersion: 7,
    confirmationPolicy: QUALIFICATION_CONFIRMATION_POLICY,
    mode: 'official',
    attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status,
    createdAt,
    completedAt: status === 'incomplete' ? null : createdAt,
    evidenceGeneratedAt: createdAt,
    summary: `Fixture ${status} result.`,
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
      packagesRepositoryCommit: 'packages-commit',
      packagesRepositoryFingerprint: 'a'.repeat(64),
      packagesRepositoryDirty: false,
      qualificationRepositoryCommit: 'd'.repeat(40),
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'b'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'c'.repeat(64),
      qualificationDigest: 'd'.repeat(64),
      targetDigest: 'e'.repeat(64),
      baselineAttemptId: null,
      packages: [],
    },
    stages: [],
    cases: [],
    artifactDigests: {},
  });

describe('qualification result recording', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('preserves attempts, latest status, last passing attempt, and artifact integrity', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-passed',
      resultsRoot,
    });

    const passing = await recordQualificationResult(
      {
        artifactDirectory,
        result: passingResult,
        sanitizationContext,
      },
      resultsRoot,
    );
    await recordQualificationResult(
      {
        artifactDirectory,
        result: createResult('attempt-failed', '2026-08-20T11:00:00.000Z', 'failed'),
        sanitizationContext,
      },
      resultsRoot,
    );
    const latest = await readJsonFile(
      path.join(resultsRoot, TARGET_KEY, 'latest.json'),
      QualificationLatestResultSchema,
    );

    expect(Object.keys(passing.artifactDigests)).toHaveLength(19);
    expect(Object.keys(passing.artifactDigests)).toContain(
      'cases/release-case/trials/initial/judge-output.json',
    );
    expect(latest).toMatchObject({
      latestAttemptId: 'attempt-failed',
      latestStatus: 'failed',
      lastPassingAttemptId: 'attempt-passed',
    });
    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: true,
      attempts: 2,
      issues: [],
    });

    await writeFile(
      await getRecordedArtifactPath(resultsRoot, 'attempt-failed', 'coverage.json'),
      `${JSON.stringify({
        passed: false,
        requiredClaims: ['qualification.support-gate'],
        declaredClaims: ['qualification.support-gate'],
        missingClaims: [],
        unknownClaims: [],
        uncoveredCaseIds: [],
      })}\n`,
      'utf8',
    );

    expect(await verifyQualificationResults(resultsRoot)).toMatchObject({
      passed: false,
      attempts: 0,
      issues: [
        {
          path: TARGET_KEY,
          message: 'Qualification artifact digest does not match coverage.json.',
        },
      ],
    });
  });

  test('verifies self-contained recorded evidence without reading Git objects', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-recorded-contract',
      resultsRoot,
    });
    await recordQualificationResult(
      { artifactDirectory, result: passingResult, sanitizationContext },
      resultsRoot,
    );

    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: true,
      attempts: 1,
      issues: [],
    });
  });

  test('rejects undeclared entries beside recorded attempts', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-unexpected-entry',
      resultsRoot,
    });
    await recordQualificationResult(
      { artifactDirectory, result: passingResult, sanitizationContext },
      resultsRoot,
    );
    await writeFile(
      path.join(resultsRoot, TARGET_KEY, 'attempts', 'unexpected.txt'),
      'unexpected\n',
    );

    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: false,
      attempts: 0,
      issues: [
        {
          path: TARGET_KEY,
          message: 'Qualification attempts contain an unexpected entry: unexpected.txt',
        },
      ],
    });
  });

  test('persists execution errors and explicitly published incomplete attempts', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    await writeFile(
      path.join(artifactDirectory, 'error.json'),
      '{"stageId":"candidate","message":"Candidate failed."}\n',
      'utf8',
    );

    await recordQualificationResult(
      {
        artifactDirectory,
        result: createResult('attempt-errored', '2026-08-20T10:00:00.000Z', 'errored'),
        sanitizationContext,
      },
      resultsRoot,
    );
    await rm(path.join(artifactDirectory, 'error.json'));
    await writeFile(
      path.join(artifactDirectory, 'interruption.json'),
      '{"stageId":"case:release-case:actor","message":"Execution interrupted."}\n',
      'utf8',
    );
    await recordQualificationResult(
      {
        artifactDirectory,
        result: createResult('attempt-incomplete', '2026-08-20T11:00:00.000Z', 'incomplete'),
        sanitizationContext,
      },
      resultsRoot,
    );
    const latest = await readJsonFile(
      path.join(resultsRoot, REPOSITORY_CUSTOM_TARGET_KEY, 'latest.json'),
      QualificationLatestResultSchema,
    );

    expect(latest).toMatchObject({
      latestAttemptId: 'attempt-incomplete',
      latestStatus: 'incomplete',
      lastPassingAttemptId: null,
    });
    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: true,
      attempts: 2,
      issues: [],
    });
  });

  test('rejects a latest pointer whose status does not match its attempt', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-passed',
      resultsRoot,
    });
    await recordQualificationResult(
      {
        artifactDirectory,
        result: passingResult,
        sanitizationContext,
      },
      resultsRoot,
    );
    const latestPath = path.join(resultsRoot, TARGET_KEY, 'latest.json');
    const latest = await readJsonFile(latestPath, QualificationLatestResultSchema);
    await writeFile(
      latestPath,
      `${JSON.stringify({ ...latest, latestStatus: 'failed' }, null, 2)}\n`,
      'utf8',
    );

    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: false,
      attempts: 1,
      issues: [
        {
          path: `${TARGET_KEY}/latest.json`,
          message: 'Latest pointer does not match recorded attempt history.',
        },
      ],
    });
  });

  test('rejects an unsupported latest-pointer protocol', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-passed',
      resultsRoot,
    });
    await recordQualificationResult(
      {
        artifactDirectory,
        result: passingResult,
        sanitizationContext,
      },
      resultsRoot,
    );
    const latestPath = path.join(resultsRoot, TARGET_KEY, 'latest.json');
    const latest = await readJsonFile(latestPath, QualificationLatestResultSchema);
    await writeFile(
      latestPath,
      `${JSON.stringify({ ...latest, protocolVersion: 8 }, null, 2)}\n`,
      'utf8',
    );

    const verification = await verifyQualificationResults(resultsRoot);

    expect(verification.passed).toBe(false);
    expect(verification.attempts).toBe(0);
    expect(verification.issues).toHaveLength(1);
    expect(verification.issues[0]?.path).toBe(TARGET_KEY);
    expect(verification.issues[0]?.message).toContain('Invalid input: expected 7');
  });

  test.each([
    ['actor output', 'cases/release-case/trials/initial/actor-output.json'],
    ['deterministic evidence', 'cases/release-case/trials/initial/deterministic-after.json'],
    ['judge output', 'cases/release-case/trials/initial/judge-output.json'],
    ['workspace assertions', 'cases/release-case/trials/initial/workspace-assertions.json'],
  ])(
    'rejects schema-invalid %s even when its digest is recomputed',
    async (_label, relativePath) => {
      temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
      const resultsRoot = path.join(temporaryRoot, 'results');
      const artifactDirectory = path.join(temporaryRoot, 'artifacts');
      await ensureDirectory(artifactDirectory);
      const passingResult = await seedPassingQualificationEvidenceFixture({
        artifactDirectory,
        attemptId: 'attempt-passed',
        resultsRoot,
      });
      const recorded = await recordQualificationResult(
        { artifactDirectory, result: passingResult, sanitizationContext },
        resultsRoot,
      );
      const artifactPath = await getRecordedArtifactPath(
        resultsRoot,
        recorded.attemptId,
        relativePath,
      );
      await writeJsonFileAtomically(artifactPath, {});
      await synchronizeRecordedArtifactDigests(resultsRoot, recorded.attemptId, [relativePath]);

      const verification = await verifyQualificationResults(resultsRoot);

      expect(verification.passed).toBe(false);
      expect(verification.issues).toHaveLength(1);
      expect(verification.issues[0]?.path).toBe(
        path.posix.join(TARGET_KEY, 'attempts', createQualificationAttemptKey(recorded.attemptId)),
      );
      expect(verification.issues[0]?.message).toContain('Invalid input');
    },
  );

  test('rejects passing evidence whose observed changes escape a path-pattern allowlist', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-passed',
      resultsRoot,
    });
    const recorded = await recordQualificationResult(
      { artifactDirectory, result: passingResult, sanitizationContext },
      resultsRoot,
    );
    const actorOutputPath = await getRecordedArtifactPath(
      resultsRoot,
      recorded.attemptId,
      'cases/release-case/trials/initial/actor-output.json',
    );
    const workspaceAssertionsPath = await getRecordedArtifactPath(
      resultsRoot,
      recorded.attemptId,
      'cases/release-case/trials/initial/workspace-assertions.json',
    );
    const unrelatedEntry = {
      path: 'src/unrelated.ts',
      kind: 'file',
      mode: 0o100644,
      sha256: 'f'.repeat(64),
    };
    await Promise.all([
      writeJsonFileAtomically(actorOutputPath, {
        outcome: 'completed',
        summary: 'Changed an unrelated source file.',
        changedFiles: [unrelatedEntry.path],
        observations: [],
        unresolved: [],
      }),
      writeJsonFileAtomically(workspaceAssertionsPath, {
        passed: true,
        failures: [],
        before: [],
        after: [unrelatedEntry],
        changedPaths: [unrelatedEntry.path],
      }),
    ]);
    await synchronizeRecordedArtifactDigests(resultsRoot, recorded.attemptId, [
      'cases/release-case/trials/initial/actor-output.json',
      'cases/release-case/trials/initial/workspace-assertions.json',
    ]);

    const verification = await verifyQualificationResults(resultsRoot);

    expect(verification.passed).toBe(false);
    expect(verification.issues).toHaveLength(1);
    expect(verification.issues[0]?.message).toContain(
      'changed paths contradict its workspace contract',
    );
  });

  test('rejects contradictory deterministic evidence retained by a recovered initial trial', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-recovered',
      isRecovered: true,
      resultsRoot,
    });
    const recorded = await recordQualificationResult(
      { artifactDirectory, result: passingResult, sanitizationContext },
      resultsRoot,
    );
    const relativePath = 'cases/release-case/trials/initial/deterministic-after.json';
    const artifactPath = await getRecordedArtifactPath(
      resultsRoot,
      recorded.attemptId,
      relativePath,
    );
    const artifact = JSON.parse(await readFile(artifactPath, 'utf8')) as {
      summary: { coreValid: boolean };
    };
    artifact.summary.coreValid = false;
    await writeJsonFileAtomically(artifactPath, artifact);
    await synchronizeRecordedArtifactDigests(resultsRoot, recorded.attemptId, [relativePath]);

    const verification = await verifyQualificationResults(resultsRoot);

    expect(verification.passed).toBe(false);
    expect(verification.issues).toHaveLength(1);
    expect(verification.issues[0]?.message).toContain(
      'contradictory release-case initial post-actor deterministic evidence',
    );
  });

  test.each(['actor', 'judge'] as const)(
    'rejects a passing trial with an observed %s command-policy violation',
    async (role) => {
      temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
      const resultsRoot = path.join(temporaryRoot, 'results');
      const artifactDirectory = path.join(temporaryRoot, 'artifacts');
      await ensureDirectory(artifactDirectory);
      const passingResult = await seedPassingQualificationEvidenceFixture({
        artifactDirectory,
        attemptId: `attempt-${role}-policy`,
        resultsRoot,
      });
      const recorded = await recordQualificationResult(
        { artifactDirectory, result: passingResult, sanitizationContext },
        resultsRoot,
      );
      const relativeEvidencePath = `cases/release-case/trials/initial/${role}-evidence.json`;
      const evidencePath = await getRecordedArtifactPath(
        resultsRoot,
        recorded.attemptId,
        relativeEvidencePath,
      );
      const evidence = await readJsonFile(evidencePath, QualificationModelStageEvidenceSchema);
      await writeJsonFileAtomically(evidencePath, {
        ...evidence,
        commandPolicy: {
          ...evidence.commandPolicy,
          completedCommandCount: 1,
          networkAccess: {
            status: 'observed',
            observedCount: 1,
            indeterminateCount: 0,
          },
        },
      });
      await synchronizeRecordedArtifactDigests(resultsRoot, recorded.attemptId, [
        relativeEvidencePath,
      ]);

      const verification = await verifyQualificationResults(resultsRoot);

      expect(verification.passed).toBe(false);
      expect(verification.issues).toHaveLength(1);
      expect(verification.issues[0]?.message).toContain(
        role === 'actor'
          ? 'ran a judge after runner-owned failure'
          : 'contradictory derived verdict',
      );
    },
  );

  test('rejects invalid passing artifacts before publishing an attempt', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'invalid-passing-attempt',
      resultsRoot,
    });
    await writeJsonFileAtomically(
      path.join(
        artifactDirectory,
        'cases',
        'release-case',
        'trials',
        'initial',
        'actor-output.json',
      ),
      {},
    );

    await expect(
      recordQualificationResult(
        { artifactDirectory, result: passingResult, sanitizationContext },
        resultsRoot,
      ),
    ).rejects.toThrow('Invalid input');
    await expect(verifyQualificationResults(resultsRoot)).resolves.toStrictEqual({
      passed: true,
      attempts: 0,
      issues: [],
    });
  });

  test('rejects a latest pointer without recorded attempt history', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'unrecorded-attempt',
      resultsRoot,
    });
    const targetRoot = path.join(resultsRoot, TARGET_KEY);
    await ensureDirectory(targetRoot);
    await writeFile(
      path.join(targetRoot, 'latest.json'),
      `${JSON.stringify(
        {
          protocolVersion: 7,
          adapterId: 'custom',
          implementationId: 'custom',
          latestAttemptId: 'missing-attempt',
          latestStatus: 'passed',
          lastPassingAttemptId: 'missing-attempt',
          updatedAt: '2026-08-20T10:00:00.000Z',
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: false,
      attempts: 0,
      issues: [
        {
          path: `${TARGET_KEY}/latest.json`,
          message: 'Latest pointer exists without any recorded attempt history.',
        },
      ],
    });
  });

  test('sanitizes structured and text evidence again at the publication boundary', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(
      path.join(artifactDirectory, 'cases', 'sanitization', 'trials', 'initial'),
    );
    await writeFile(
      path.join(
        artifactDirectory,
        'cases',
        'sanitization',
        'trials',
        'initial',
        'actor-output.json',
      ),
      `${JSON.stringify({
        outcome: 'blocked',
        summary: 'Stopped without changing the workspace.',
        changedFiles: [],
        observations: [`Credential sk-${'c'.repeat(24)} at /attempt/workspace/file.ts.`],
        unresolved: [],
      })}\n`,
      'utf8',
    );
    await writeFile(
      path.join(
        artifactDirectory,
        'cases',
        'sanitization',
        'trials',
        'initial',
        'actor-events.jsonl',
      ),
      `${JSON.stringify({
        eventType: 'command.completed',
        exitCode: 0,
        moldeaCommandCount: 0,
        outputByteCount: 0,
        status: 'completed',
      })}\n`,
      'utf8',
    );

    const recorded = await recordQualificationResult(
      {
        artifactDirectory,
        result: {
          ...createResult('sanitized-attempt', '2026-08-20T10:00:00.000Z', 'failed'),
          summary: `Failure at /skill/SKILL.md with sk-${'b'.repeat(24)}.`,
        },
        sanitizationContext,
      },
      resultsRoot,
    );
    const actorOutputPath = await getRecordedArtifactPath(
      resultsRoot,
      recorded.attemptId,
      'cases/sanitization/trials/initial/actor-output.json',
      REPOSITORY_CUSTOM_TARGET_KEY,
    );
    const actorEventsPath = await getRecordedArtifactPath(
      resultsRoot,
      recorded.attemptId,
      'cases/sanitization/trials/initial/actor-events.jsonl',
      REPOSITORY_CUSTOM_TARGET_KEY,
    );

    expect(recorded.summary).toBe('Failure at <skill-repository>/SKILL.md with <redacted-token>.');
    expect(await readFile(actorOutputPath, 'utf8')).toBe(
      `${JSON.stringify(
        {
          outcome: 'blocked',
          summary: 'Stopped without changing the workspace.',
          changedFiles: [],
          observations: ['Credential <redacted-token> at <attempt>/workspace/file.ts.'],
          unresolved: [],
        },
        null,
        2,
      )}\n`,
    );
    expect(await readFile(actorEventsPath, 'utf8')).toBe(
      `${JSON.stringify({
        eventType: 'command.completed',
        exitCode: 0,
        moldeaCommandCount: 0,
        outputByteCount: 0,
        status: 'completed',
      })}\n`,
    );
    expect(await verifyQualificationResults(resultsRoot)).toMatchObject({ passed: true });
  });

  test('rejects dirty passing evidence while preserving a dirty preflight failure', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const cleanPassingResult = createResult(
      'dirty-passing-attempt',
      '2026-08-20T10:00:00.000Z',
      'passed',
    );
    const dirtyPassingResult: IQualificationAttemptResult = {
      ...cleanPassingResult,
      provenance: {
        ...cleanPassingResult.provenance,
        packagesRepositoryDirty: true,
      },
    };

    expect(QualificationAttemptResultDraftSchema.safeParse(dirtyPassingResult).success).toBe(true);
    expect(QualificationAttemptResultSchema.safeParse(dirtyPassingResult).success).toBe(false);

    await expect(
      recordQualificationResult(
        { artifactDirectory, result: dirtyPassingResult, sanitizationContext },
        resultsRoot,
      ),
    ).rejects.toThrow('Passing qualification evidence requires clean repository inputs.');

    const dirtyFailedResult = QualificationAttemptResultSchema.parse({
      ...createResult('dirty-failed-attempt', '2026-08-20T11:00:00.000Z', 'failed'),
      provenance: {
        ...createResult('dirty-failed-attempt', '2026-08-20T11:00:00.000Z', 'failed').provenance,
        packagesRepositoryDirty: true,
      },
    });
    const recordedResult = await recordQualificationResult(
      { artifactDirectory, result: dirtyFailedResult, sanitizationContext },
      resultsRoot,
    );

    expect(recordedResult.status).toBe('failed');
    expect(recordedResult.provenance.packagesRepositoryDirty).toBe(true);
    expect(await verifyQualificationResults(resultsRoot)).toMatchObject({
      passed: true,
      attempts: 1,
    });
  });

  test('rejects passing evidence from a custom model endpoint or expanded egress boundary', () => {
    const passingResult = createResult(
      'untrusted-host-attempt',
      '2026-08-20T10:00:00.000Z',
      'passed',
    );

    for (const provenanceChange of [
      {
        modelEndpoint: {
          origin: 'https://gateway.example.com',
          sha256: 'f'.repeat(64),
        },
      },
      {
        allowedEgressHosts: [
          ...passingResult.provenance.allowedEgressHosts,
          'registry.example.com',
        ],
      },
      { sslCertificateFileSha256: 'f'.repeat(64) },
    ]) {
      expect(
        QualificationAttemptResultSchema.safeParse({
          ...passingResult,
          provenance: { ...passingResult.provenance, ...provenanceChange },
        }).success,
      ).toBe(false);
    }
  });

  test('rejects manually committed dirty passing evidence during verification', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    const cleanPassingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'dirty-passing-attempt',
      resultsRoot,
    });
    await recordQualificationResult(
      { artifactDirectory, result: cleanPassingResult, sanitizationContext },
      resultsRoot,
    );
    const attemptDirectory = getRecordedAttemptDirectory(resultsRoot, cleanPassingResult.attemptId);
    const dirtyPassingResult: IQualificationAttemptResult = {
      ...cleanPassingResult,
      provenance: {
        ...cleanPassingResult.provenance,
        skillRepositoryDirty: true,
      },
    };
    await writeFile(
      path.join(attemptDirectory, 'attempt.json'),
      `${JSON.stringify(dirtyPassingResult, null, 2)}\n`,
      'utf8',
    );

    const verification = await verifyQualificationResults(resultsRoot);

    expect(verification.passed).toBe(false);
    expect(verification.attempts).toBe(0);
    expect(verification.issues).toHaveLength(1);
    expect(verification.issues[0]?.path).toBe(TARGET_KEY);
    expect(verification.issues[0]?.message).toContain(
      'Passing qualification evidence requires clean repository inputs.',
    );
  });
});
