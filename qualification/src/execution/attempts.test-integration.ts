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
import { QUALIFICATION_CONFIRMATION_POLICY } from '../constants/index.ts';
import { ensureDirectory, writeJsonFileAtomically } from '../filesystem/index.ts';
import { verifyQualificationResults } from '../result/index.ts';
import {
  getLocalAttemptDirectory,
  inspectLocalAttemptCheckpoints,
  listLocalAttemptCheckpoints,
  recordIncompleteAttempt,
} from './attempts.ts';

/** Creates one local incomplete attempt whose public artifact can optionally fail publication. */
const createIncompleteAttemptFixture = async (options: {
  attemptDirectory: string;
  attemptId: string;
  hasMalformedArtifact?: boolean;
  mode?: 'diagnostic' | 'official';
}): Promise<void> => {
  const mode = options.mode ?? 'official';
  const checkpoint = await createAttemptCheckpoint({
    attemptDirectory: options.attemptDirectory,
    attemptId: options.attemptId,
    parentAttemptId: null,
    selection: { adapterId: 'custom', implementationId: 'custom' },
    isDryRun: false,
    mode,
    selectedCaseId: mode === 'diagnostic' ? 'evaluate-aligned-project' : null,
    useCache: true,
    packagesRepository: '/packages',
    skillRepository: '/skill',
    profileDigest: 'a'.repeat(64),
    qualificationDigest: 'b'.repeat(64),
    skillDigest: 'c'.repeat(64),
    packagesRepositoryFingerprint: 'd'.repeat(64),
    packagesDigest: 'e'.repeat(64),
    targetDigest: 'f'.repeat(64),
    executionEnvironment: {
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
    },
    stageIds: [],
  });
  await writeAttemptCheckpoint(options.attemptDirectory, { ...checkpoint, status: 'incomplete' });
  const publicDirectory = path.join(options.attemptDirectory, 'public');
  await ensureDirectory(publicDirectory);
  await writeFile(
    path.join(publicDirectory, 'interruption.json'),
    options.hasMalformedArtifact === true
      ? '{'
      : '{"stageId":null,"message":"Execution interrupted."}\n',
    'utf8',
  );
  const result = QualificationAttemptResultDraftSchema.parse({
    protocolVersion: 6,
    confirmationPolicy: QUALIFICATION_CONFIRMATION_POLICY,
    mode,
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
      qualificationRepositoryCommit: 'qualification-commit',
      qualificationRepositoryDirty: false,
      skillRepositoryCommit: 'skill-commit',
      skillRepositoryFingerprint: 'c'.repeat(64),
      skillRepositoryDirty: false,
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      targetDigest: 'f'.repeat(64),
      baselineAttemptId: null,
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

  test('rejects diagnostic attempts before public recording', async () => {
    const attemptId = `test-diagnostic-${randomUUID()}`;
    attemptDirectory = getLocalAttemptDirectory(attemptId);
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-diagnostic-result-'));
    await createIncompleteAttemptFixture({
      attemptDirectory,
      attemptId,
      mode: 'diagnostic',
    });

    await expect(
      recordIncompleteAttempt(attemptId, path.join(temporaryRoot, 'results')),
    ).rejects.toThrow('diagnostic attempts cannot be recorded as public evidence.');
    expect((await readAttemptCheckpoint(attemptDirectory)).recordedAt).toBeNull();
  });
});

describe('qualification attempt discovery', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('preserves and reports incompatible checkpoints without hiding valid attempts', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-attempt-discovery-'));
    const attemptsRoot = path.join(temporaryRoot, 'attempts');
    const validAttemptId = '20260820T000001000Z-custom-custom-valid';
    const validAttemptDirectory = path.join(attemptsRoot, validAttemptId);
    const validCheckpoint = await createAttemptCheckpoint({
      attemptDirectory: validAttemptDirectory,
      attemptId: validAttemptId,
      parentAttemptId: null,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      isDryRun: true,
      mode: 'dry-run',
      selectedCaseId: null,
      useCache: false,
      packagesRepository: '/packages',
      skillRepository: '/skill',
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      skillDigest: 'c'.repeat(64),
      packagesRepositoryFingerprint: 'd'.repeat(64),
      packagesDigest: 'e'.repeat(64),
      targetDigest: 'f'.repeat(64),
      executionEnvironment: {
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
      },
      stageIds: [],
    });
    const legacyAttemptId = '20260820T000002000Z-custom-custom-legacy';
    await writeJsonFileAtomically(path.join(attemptsRoot, legacyAttemptId, 'checkpoint.json'), {
      ...validCheckpoint,
      attemptId: legacyAttemptId,
      protocolVersion: 3,
    });
    const unreadableAttemptId = '20260820T000003000Z-custom-custom-unreadable';
    await ensureDirectory(path.join(attemptsRoot, unreadableAttemptId));
    await writeFile(path.join(attemptsRoot, unreadableAttemptId, 'checkpoint.json'), '{', 'utf8');
    const invalidAttemptId = '20260820T000004000Z-custom-custom-invalid';
    await writeJsonFileAtomically(path.join(attemptsRoot, invalidAttemptId, 'checkpoint.json'), {
      protocolVersion: 6,
    });
    const mismatchedAttemptId = '20260820T000005000Z-custom-custom-mismatched';
    await writeJsonFileAtomically(
      path.join(attemptsRoot, mismatchedAttemptId, 'checkpoint.json'),
      validCheckpoint,
    );

    const inspection = await inspectLocalAttemptCheckpoints(attemptsRoot);

    expect(inspection.attempts.map(({ attemptId }) => attemptId)).toStrictEqual([validAttemptId]);
    expect(inspection.unavailableAttempts).toHaveLength(4);
    expect(inspection.unavailableAttempts[0]).toStrictEqual({
      attemptId: mismatchedAttemptId,
      kind: 'invalid-checkpoint',
      message: `Checkpoint attempt id ${validAttemptId} does not match its directory and was preserved without changes.`,
      protocolVersion: 6,
    });
    expect(inspection.unavailableAttempts[1]?.attemptId).toBe(invalidAttemptId);
    expect(inspection.unavailableAttempts[1]?.kind).toBe('invalid-checkpoint');
    expect(inspection.unavailableAttempts[1]?.message).toContain(
      'Checkpoint is invalid and was preserved without changes.',
    );
    expect(inspection.unavailableAttempts[1]?.protocolVersion).toBe(6);
    expect(inspection.unavailableAttempts.slice(2)).toStrictEqual([
      {
        attemptId: unreadableAttemptId,
        kind: 'unreadable-checkpoint',
        message: 'Checkpoint could not be read as JSON and was preserved without changes.',
        protocolVersion: null,
      },
      {
        attemptId: legacyAttemptId,
        kind: 'unsupported-protocol',
        message:
          'Checkpoint protocol version 3 is not supported by protocol version 6 and was preserved without changes.',
        protocolVersion: 3,
      },
    ]);
    expect(
      (await listLocalAttemptCheckpoints(attemptsRoot)).map(({ attemptId }) => attemptId),
    ).toStrictEqual([validAttemptId]);
  });
});
