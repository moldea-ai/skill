// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  QualificationAttemptResultDraftSchema,
  QualificationAttemptResultSchema,
  QualificationLatestResultSchema,
  type IQualificationAttemptResult,
} from '../contracts/index.ts';
import {
  calculateFileSha256,
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../vitest/evidence-fixture.ts';
import { recordQualificationResult, verifyQualificationResults } from './recorder.ts';

const sanitizationContext = {
  attemptDirectory: '/attempt',
  packagesRepository: '/packages',
  skillRepository: '/skill',
};

const historicalDeterministicArtifact = {
  summary: {
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

const createResult = (
  attemptId: string,
  createdAt: string,
  status: 'errored' | 'failed' | 'incomplete' | 'passed',
): IQualificationAttemptResult =>
  QualificationAttemptResultSchema.parse({
    protocolVersion: 5,
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
      qualificationRepositoryCommit: 'qualification-commit',
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

  test('preserves history, latest status, last passing attempt, and artifact integrity', async () => {
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
      path.join(resultsRoot, 'custom', 'custom', 'latest.json'),
      QualificationLatestResultSchema,
    );

    expect(Object.keys(passing.artifactDigests)).toHaveLength(18);
    expect(Object.keys(passing.artifactDigests)).toContain('cases/release-case/judge-output.json');
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
      path.join(resultsRoot, 'custom', 'custom', 'attempts', 'attempt-failed', 'coverage.json'),
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
      attempts: 2,
      issues: [
        {
          path: 'custom/custom/attempts/attempt-failed',
          message: 'Artifact digests do not match attempt.json.',
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
      path.join(resultsRoot, 'custom', 'custom', 'latest.json'),
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
    const latestPath = path.join(resultsRoot, 'custom', 'custom', 'latest.json');
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
          path: 'custom/custom/latest.json',
          message: 'Latest pointer does not match recorded attempt history.',
        },
      ],
    });
  });

  test.each([
    ['actor output', 'cases/release-case/actor-output.json'],
    ['deterministic evidence', 'cases/release-case/deterministic-after.json'],
    ['judge output', 'cases/release-case/judge-output.json'],
    ['workspace assertions', 'cases/release-case/workspace-assertions.json'],
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
      const attemptDirectory = path.join(
        resultsRoot,
        'custom',
        'custom',
        'attempts',
        recorded.attemptId,
      );
      const artifactPath = path.join(attemptDirectory, relativePath);
      await writeJsonFileAtomically(artifactPath, {});
      await writeJsonFileAtomically(path.join(attemptDirectory, 'attempt.json'), {
        ...recorded,
        artifactDigests: {
          ...recorded.artifactDigests,
          [relativePath]: await calculateFileSha256(artifactPath),
        },
      });

      const verification = await verifyQualificationResults(resultsRoot);

      expect(verification.passed).toBe(false);
      expect(verification.issues).toHaveLength(1);
      expect(verification.issues[0]?.path).toBe('custom/custom/attempts/attempt-passed');
      expect(verification.issues[0]?.message).toContain('Invalid input');
    },
  );

  test('rejects a current attempt that uses the historical deterministic artifact shape', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(artifactDirectory);
    const passingResult = await seedPassingQualificationEvidenceFixture({
      artifactDirectory,
      attemptId: 'attempt-current',
      resultsRoot,
    });
    const recorded = await recordQualificationResult(
      { artifactDirectory, result: passingResult, sanitizationContext },
      resultsRoot,
    );
    const attemptDirectory = path.join(
      resultsRoot,
      'custom',
      'custom',
      'attempts',
      recorded.attemptId,
    );
    const artifactPath = path.join(
      attemptDirectory,
      'cases',
      'release-case',
      'deterministic-after.json',
    );
    await writeJsonFileAtomically(artifactPath, historicalDeterministicArtifact);
    await writeJsonFileAtomically(path.join(attemptDirectory, 'attempt.json'), {
      ...recorded,
      artifactDigests: {
        ...recorded.artifactDigests,
        'cases/release-case/deterministic-after.json': await calculateFileSha256(artifactPath),
      },
    });

    const verification = await verifyQualificationResults(resultsRoot);

    expect(verification.passed).toBe(false);
    expect(verification.issues).toHaveLength(1);
    expect(verification.issues[0]?.message).toContain('Invalid input');
  });

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
    const attemptDirectory = path.join(
      resultsRoot,
      'custom',
      'custom',
      'attempts',
      recorded.attemptId,
    );
    const actorOutputPath = path.join(
      attemptDirectory,
      'cases',
      'release-case',
      'actor-output.json',
    );
    const workspaceAssertionsPath = path.join(
      attemptDirectory,
      'cases',
      'release-case',
      'workspace-assertions.json',
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
        commands: [],
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
    await writeJsonFileAtomically(path.join(attemptDirectory, 'attempt.json'), {
      ...recorded,
      artifactDigests: {
        ...recorded.artifactDigests,
        'cases/release-case/actor-output.json': await calculateFileSha256(actorOutputPath),
        'cases/release-case/workspace-assertions.json':
          await calculateFileSha256(workspaceAssertionsPath),
      },
    });

    const verification = await verifyQualificationResults(resultsRoot);

    expect(verification.passed).toBe(false);
    expect(verification.issues).toHaveLength(1);
    expect(verification.issues[0]?.message).toContain(
      'changed paths contradict its workspace contract',
    );
  });

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
      path.join(artifactDirectory, 'cases', 'release-case', 'actor-output.json'),
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
    const targetRoot = path.join(resultsRoot, 'custom', 'custom');
    await ensureDirectory(targetRoot);
    await writeFile(
      path.join(targetRoot, 'latest.json'),
      `${JSON.stringify(
        {
          protocolVersion: 5,
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
          path: 'custom/custom/latest.json',
          message: 'Latest pointer exists without any recorded attempt history.',
        },
      ],
    });
  });

  test('sanitizes structured and text evidence again at the publication boundary', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const artifactDirectory = path.join(temporaryRoot, 'artifacts');
    await ensureDirectory(path.join(artifactDirectory, 'cases', 'sanitization'));
    await writeFile(
      path.join(artifactDirectory, 'cases', 'sanitization', 'actor-output.json'),
      `${JSON.stringify({
        outcome: 'blocked',
        summary: 'Stopped without changing the workspace.',
        commands: [],
        changedFiles: [],
        observations: [`Credential sk-${'c'.repeat(24)} at /attempt/workspace/file.ts.`],
        unresolved: [],
      })}\n`,
      'utf8',
    );
    await writeFile(
      path.join(artifactDirectory, 'cases', 'sanitization', 'actor-events.jsonl'),
      `${JSON.stringify({ authorization: `Bearer ${'a'.repeat(24)}`, path: '/packages/project' })}\n`,
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
    const recordedDirectory = path.join(
      resultsRoot,
      'custom',
      'custom',
      'attempts',
      recorded.attemptId,
    );

    expect(recorded.summary).toBe('Failure at <skill-repository>/SKILL.md with <redacted-token>.');
    expect(
      await readFile(
        path.join(recordedDirectory, 'cases', 'sanitization', 'actor-output.json'),
        'utf8',
      ),
    ).toBe(
      `${JSON.stringify(
        {
          outcome: 'blocked',
          summary: 'Stopped without changing the workspace.',
          commands: [],
          changedFiles: [],
          observations: ['Credential <redacted-token> at <attempt>/workspace/file.ts.'],
          unresolved: [],
        },
        null,
        2,
      )}\n`,
    );
    expect(
      await readFile(
        path.join(recordedDirectory, 'cases', 'sanitization', 'actor-events.jsonl'),
        'utf8',
      ),
    ).toBe(
      `${JSON.stringify({ authorization: '<redacted-credential>', path: '<packages-repository>/project' })}\n`,
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
    const targetRoot = path.join(resultsRoot, 'custom', 'custom');
    const attemptDirectory = path.join(targetRoot, 'attempts', 'dirty-passing-attempt');
    const cleanPassingResult = createResult(
      'dirty-passing-attempt',
      '2026-08-20T10:00:00.000Z',
      'passed',
    );
    const dirtyPassingResult: IQualificationAttemptResult = {
      ...cleanPassingResult,
      provenance: {
        ...cleanPassingResult.provenance,
        skillRepositoryDirty: true,
      },
    };
    const latestResult = QualificationLatestResultSchema.parse({
      protocolVersion: 5,
      adapterId: 'custom',
      implementationId: 'custom',
      latestAttemptId: dirtyPassingResult.attemptId,
      latestStatus: dirtyPassingResult.status,
      lastPassingAttemptId: dirtyPassingResult.attemptId,
      updatedAt: dirtyPassingResult.createdAt,
    });
    await ensureDirectory(attemptDirectory);
    await Promise.all([
      writeFile(
        path.join(attemptDirectory, 'attempt.json'),
        `${JSON.stringify(dirtyPassingResult, null, 2)}\n`,
        'utf8',
      ),
      writeFile(
        path.join(targetRoot, 'latest.json'),
        `${JSON.stringify(latestResult, null, 2)}\n`,
        'utf8',
      ),
    ]);

    const verification = await verifyQualificationResults(resultsRoot);

    expect(verification.passed).toBe(false);
    expect(verification.attempts).toBe(0);
    expect(verification.issues).toHaveLength(1);
    expect(verification.issues[0]?.path).toBe('custom/custom');
    expect(verification.issues[0]?.message).toContain(
      'Passing qualification evidence requires clean repository inputs.',
    );
  });
});
