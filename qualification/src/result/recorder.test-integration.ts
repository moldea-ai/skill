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
import { ensureDirectory, readJsonFile } from '../filesystem/index.ts';
import { recordQualificationResult, verifyQualificationResults } from './recorder.ts';

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
    protocolVersion: 2,
    attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status,
    createdAt,
    completedAt: status === 'incomplete' ? null : createdAt,
    evidenceGeneratedAt: createdAt,
    summary: `Fixture ${status} result.`,
    provenance: {
      model: 'gpt-5.6-terra',
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
      targetSupportLevel: 'supported',
      qualificationRepositoryCommit: 'qualification-commit',
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'b'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'c'.repeat(64),
      qualificationDigest: 'd'.repeat(64),
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
    await writeFile(path.join(artifactDirectory, 'coverage.json'), '{"passed":true}\n', 'utf8');

    const passing = await recordQualificationResult(
      {
        artifactDirectory,
        result: createResult('attempt-passed', '2026-08-20T10:00:00.000Z', 'passed'),
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

    expect(Object.keys(passing.artifactDigests)).toStrictEqual(['coverage.json']);
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
      '{"passed":false}\n',
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
    await writeFile(path.join(artifactDirectory, 'error.json'), '{}\n', 'utf8');

    await recordQualificationResult(
      {
        artifactDirectory,
        result: createResult('attempt-errored', '2026-08-20T10:00:00.000Z', 'errored'),
        sanitizationContext,
      },
      resultsRoot,
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
    await recordQualificationResult(
      {
        artifactDirectory,
        result: createResult('attempt-passed', '2026-08-20T10:00:00.000Z', 'passed'),
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

  test('rejects a latest pointer without recorded attempt history', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-results-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    const targetRoot = path.join(resultsRoot, 'custom', 'custom');
    await ensureDirectory(targetRoot);
    await writeFile(
      path.join(targetRoot, 'latest.json'),
      `${JSON.stringify(
        {
          protocolVersion: 2,
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
    await ensureDirectory(artifactDirectory);
    await writeFile(
      path.join(artifactDirectory, 'actor-output.json'),
      `${JSON.stringify({ apiKey: 'opaque-secret', path: '/attempt/workspace/file.ts' })}\n`,
      'utf8',
    );
    await writeFile(
      path.join(artifactDirectory, 'actor-events.jsonl'),
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
    expect(await readFile(path.join(recordedDirectory, 'actor-output.json'), 'utf8')).toBe(
      `${JSON.stringify(
        { apiKey: '<redacted-credential>', path: '<attempt>/workspace/file.ts' },
        null,
        2,
      )}\n`,
    );
    expect(await readFile(path.join(recordedDirectory, 'actor-events.jsonl'), 'utf8')).toBe(
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
      protocolVersion: 2,
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
