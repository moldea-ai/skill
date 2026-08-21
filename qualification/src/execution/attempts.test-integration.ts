// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  createAttemptCheckpoint,
  readAttemptCheckpoint,
  writeAttemptCheckpoint,
} from '../checkpoint/index.ts';
import { QualificationAttemptResultDraftSchema } from '../contracts/index.ts';
import { ensureDirectory, writeJsonFileAtomically } from '../filesystem/index.ts';
import { verifyQualificationResults } from '../result/index.ts';
import { getLocalAttemptDirectory, recordIncompleteAttempt } from './attempts.ts';

/** Creates one local incomplete attempt whose public artifact can optionally fail publication. */
const createIncompleteAttemptFixture = async (options: {
  attemptDirectory: string;
  attemptId: string;
  hasMalformedArtifact?: boolean;
}): Promise<void> => {
  const checkpoint = await createAttemptCheckpoint({
    attemptDirectory: options.attemptDirectory,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    isDryRun: false,
    useCache: true,
    packagesRepository: '/packages',
    skillRepository: '/skill',
    profileDigest: 'a'.repeat(64),
    qualificationDigest: 'b'.repeat(64),
    skillDigest: 'c'.repeat(64),
    packagesRepositoryFingerprint: 'd'.repeat(64),
    packagesDigest: 'e'.repeat(64),
    executionEnvironment: {
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
    },
    stageIds: [],
  });
  await writeAttemptCheckpoint(options.attemptDirectory, { ...checkpoint, status: 'incomplete' });
  const publicDirectory = path.join(options.attemptDirectory, 'public');
  await ensureDirectory(publicDirectory);
  await writeFile(
    path.join(publicDirectory, 'interruption.json'),
    options.hasMalformedArtifact === true ? '{' : '{}\n',
    'utf8',
  );
  const result = QualificationAttemptResultDraftSchema.parse({
    protocolVersion: 2,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    status: 'incomplete',
    createdAt: checkpoint.createdAt,
    completedAt: null,
    evidenceGeneratedAt: null,
    summary: 'The attempt was interrupted.',
    provenance: {
      ...checkpoint.executionEnvironment,
      packagesRepositoryCommit: 'packages-commit',
      packagesRepositoryFingerprint: 'd'.repeat(64),
      packagesRepositoryDirty: false,
      targetSupportLevel: 'experimental',
      qualificationRepositoryCommit: 'qualification-commit',
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'c'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      packages: [],
    },
    stages: [],
    cases: [],
    artifactDigests: {},
  });
  await writeJsonFileAtomically(path.join(options.attemptDirectory, 'result-draft.json'), result);
};

describe('qualification incomplete attempt recording', () => {
  let attemptDirectory: string | null = null;
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (attemptDirectory !== null) {
      await rm(attemptDirectory, { force: true, recursive: true });
    }
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('records immutable incomplete evidence and marks the local attempt as recorded', async () => {
    const attemptId = `test-incomplete-${randomUUID()}`;
    attemptDirectory = getLocalAttemptDirectory(attemptId);
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-incomplete-result-'));
    const resultsRoot = path.join(temporaryRoot, 'results');
    await createIncompleteAttemptFixture({
      attemptDirectory,
      attemptId,
    });

    const recordedResult = await recordIncompleteAttempt(attemptId, resultsRoot);

    expect(recordedResult.status).toBe('incomplete');
    expect((await readAttemptCheckpoint(attemptDirectory)).recordedAt).not.toBeNull();
    expect(await verifyQualificationResults(resultsRoot)).toStrictEqual({
      passed: true,
      attempts: 1,
      issues: [],
    });
  });

  test('makes the local attempt immutable before public artifact validation starts', async () => {
    const attemptId = `test-incomplete-${randomUUID()}`;
    attemptDirectory = getLocalAttemptDirectory(attemptId);
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-incomplete-result-'));
    await createIncompleteAttemptFixture({
      attemptDirectory,
      attemptId,
      hasMalformedArtifact: true,
    });

    await expect(
      recordIncompleteAttempt(attemptId, path.join(temporaryRoot, 'results')),
    ).rejects.toThrow();
    expect((await readAttemptCheckpoint(attemptDirectory)).recordedAt).not.toBeNull();
  });
});
