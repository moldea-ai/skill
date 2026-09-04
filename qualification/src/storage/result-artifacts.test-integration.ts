// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  QualificationAttemptResultSchema,
  type IQualificationAttemptResult,
} from '../contracts/index.ts';
import { QUALIFICATION_CONFIRMATION_POLICY } from '../constants/index.ts';
import {
  calculateSha256,
  ensureDirectory,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import {
  createQualificationAttemptKey,
  createQualificationAttemptStorage,
  resolveQualificationArtifactPath,
  verifyQualificationAttemptStorage,
} from './result-artifacts.ts';

const createResult = (attemptId: string, artifactDigest: string): IQualificationAttemptResult =>
  QualificationAttemptResultSchema.parse({
    protocolVersion: 7,
    confirmationPolicy: QUALIFICATION_CONFIRMATION_POLICY,
    mode: 'official',
    attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status: 'errored',
    createdAt: '2026-09-01T00:00:00.000Z',
    completedAt: '2026-09-01T00:00:00.000Z',
    evidenceGeneratedAt: null,
    summary: 'Fixture error.',
    provenance: {
      model: 'gpt-5.6-sol',
      reasoningEffort: 'medium',
      codexVersion: 'codex-cli test',
      nodeVersion: process.version,
      pnpmVersion: '11.9.0',
      gitVersion: 'git version test',
      allowedEgressHosts: ['api.openai.com'],
      hostTimeoutMs: 120_000,
      modelEndpoint: null,
      sslCertificateFileSha256: null,
      packagesRepositoryCommit: 'a'.repeat(40),
      packagesRepositoryFingerprint: 'a'.repeat(64),
      packagesRepositoryDirty: false,
      qualificationRepositoryCommit: 'b'.repeat(40),
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'c'.repeat(40),
      skillRepositoryFingerprint: 'c'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'd'.repeat(64),
      qualificationDigest: 'e'.repeat(64),
      targetDigest: 'f'.repeat(64),
      baselineAttemptId: null,
      packages: [],
    },
    stages: [],
    cases: [],
    artifactDigests: { 'error.json': artifactDigest },
  });

describe('qualification attempt storage', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('verifies exact logical identity, contained mapping, and artifact bytes', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-attempt-storage-'));
    const artifactSource = '{"stageId":"candidate","message":"Failed."}\n';
    const result = createResult('attempt-storage', calculateSha256(artifactSource));
    const attemptSource = `${JSON.stringify(result, null, 2)}\n`;
    const attemptDirectory = path.join(
      temporaryRoot,
      createQualificationAttemptKey(result.attemptId),
    );
    const storage = createQualificationAttemptStorage({
      attemptDigest: calculateSha256(attemptSource),
      cliClosureDigest: '4'.repeat(64),
      compatibility: {
        version: 1,
        qualificationEvaluatorDigest: '1'.repeat(64),
        qualificationLogicalInputDigest: '2'.repeat(64),
        qualificationBaselineEvaluatorDigest: '3'.repeat(64),
      },
      portableSkillBehaviorDigest: '5'.repeat(64),
      result,
    });
    await ensureDirectory(attemptDirectory);
    await writeTextFileAtomically(path.join(attemptDirectory, 'attempt.json'), attemptSource);
    await writeJsonFileAtomically(path.join(attemptDirectory, 'storage.json'), storage);
    const artifactPath = resolveQualificationArtifactPath(attemptDirectory, storage, 'error.json');
    await writeTextFileAtomically(artifactPath, artifactSource);

    await expect(
      verifyQualificationAttemptStorage({ attemptDirectory, result, storage }),
    ).resolves.toStrictEqual(storage);

    const unexpectedArtifactPath = path.join(attemptDirectory, 'artifacts', 'unexpected.txt');
    await writeTextFileAtomically(unexpectedArtifactPath, 'unexpected\n');
    await expect(
      verifyQualificationAttemptStorage({ attemptDirectory, result, storage }),
    ).rejects.toThrow(/unexpected artifact inventory/u);
    await rm(unexpectedArtifactPath);

    await writeFile(artifactPath, 'tampered\n', 'utf8');
    await expect(
      verifyQualificationAttemptStorage({ attemptDirectory, result, storage }),
    ).rejects.toThrow(/artifact digest/u);
    await rm(artifactPath);
    await expect(
      verifyQualificationAttemptStorage({ attemptDirectory, result, storage }),
    ).rejects.toThrow();
  });
});
