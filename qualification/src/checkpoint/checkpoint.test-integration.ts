// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { QualificationAttemptCheckpointSchema } from '../contracts/index.ts';
import {
  appendQualificationOperationalRetry,
  createAttemptCheckpoint,
  normalizeInterruptedCheckpoint,
  readAttemptCheckpoint,
  skipQualificationStageGroup,
  writeAttemptCheckpoint,
} from './checkpoint.ts';

describe('qualification checkpoints', () => {
  let temporaryDirectory: string | null = null;

  afterEach(async () => {
    if (temporaryDirectory !== null) {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  test('persists valid state atomically and normalizes an interrupted stage', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-checkpoint-'));
    const checkpoint = await createAttemptCheckpoint({
      attemptDirectory: temporaryDirectory,
      attemptId: 'attempt-1',
      parentAttemptId: null,
      selection: { adapterId: 'custom', implementationId: 'custom' },
      isDryRun: true,
      mode: 'dry-run',
      selectedCaseId: null,
      useCache: true,
      packagesRepository: '/packages',
      skillRepository: '/skill',
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'd'.repeat(64),
      skillDigest: 'b'.repeat(64),
      packagesRepositoryFingerprint: 'e'.repeat(64),
      packagesDigest: 'c'.repeat(64),
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
      stageIds: ['coverage', 'candidate'],
    });
    const runningCheckpoint = QualificationAttemptCheckpointSchema.parse({
      ...checkpoint,
      stages: {
        ...checkpoint.stages,
        coverage: {
          ...checkpoint.stages['coverage'],
          status: 'running',
          startedAt: new Date().toISOString(),
        },
      },
    });

    await writeAttemptCheckpoint(temporaryDirectory, runningCheckpoint);
    const normalized = normalizeInterruptedCheckpoint(
      await readAttemptCheckpoint(temporaryDirectory),
    );
    await writeAttemptCheckpoint(temporaryDirectory, normalized);

    expect(await readAttemptCheckpoint(temporaryDirectory)).toMatchObject({
      status: 'incomplete',
      packagesRepository: '/packages',
      packagesRepositoryFingerprint: 'e'.repeat(64),
      qualificationDigest: 'd'.repeat(64),
      targetDigest: 'f'.repeat(64),
      recordedAt: null,
      executionEnvironment: {
        model: 'gpt-5.6-sol',
        reasoningEffort: 'medium',
        codexVersion: 'codex-cli test',
      },
      stages: {
        coverage: {
          id: 'coverage',
          status: 'pending',
          startedAt: null,
        },
        candidate: { id: 'candidate', status: 'pending' },
      },
    });
  });

  test('persists retry history across interruption and skips confirmation stages atomically', async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-checkpoint-'));
    const actorStageId = 'case:test-case:trial:initial:actor';
    const confirmationStageIds = [
      'case:test-case:trial:confirmation-1:prepare',
      'case:test-case:trial:confirmation-1:actor',
    ];
    const checkpoint = await createAttemptCheckpoint({
      attemptDirectory: temporaryDirectory,
      attemptId: 'attempt-2',
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
      stageIds: [actorStageId, ...confirmationStageIds],
    });
    const runningCheckpoint = QualificationAttemptCheckpointSchema.parse({
      ...checkpoint,
      stages: {
        ...checkpoint.stages,
        [actorStageId]: {
          ...checkpoint.stages[actorStageId],
          status: 'running',
          startedAt: '2026-08-27T16:00:00.000Z',
          cacheKey: 'a'.repeat(64),
        },
      },
    });
    await writeAttemptCheckpoint(temporaryDirectory, runningCheckpoint);

    const retriedCheckpoint = await appendQualificationOperationalRetry(
      temporaryDirectory,
      runningCheckpoint,
      actorStageId,
      {
        category: 'proxy-unavailable',
        failedAt: '2026-08-27T16:00:01.000Z',
        failureCount: 1,
        retryDelayMs: 5_000,
      },
    );
    const normalizedCheckpoint = normalizeInterruptedCheckpoint(retriedCheckpoint);
    await writeAttemptCheckpoint(temporaryDirectory, normalizedCheckpoint);
    const skippedCheckpoint = await skipQualificationStageGroup(
      temporaryDirectory,
      normalizedCheckpoint,
      confirmationStageIds,
    );

    expect(skippedCheckpoint.stages[actorStageId]).toMatchObject({
      status: 'pending',
      cacheKey: 'a'.repeat(64),
      operationalRetries: [
        {
          category: 'proxy-unavailable',
          failureCount: 1,
          retryDelayMs: 5_000,
        },
      ],
    });
    for (const stageId of confirmationStageIds) {
      expect(skippedCheckpoint.stages[stageId]).toMatchObject({
        id: stageId,
        status: 'skipped',
        durationMs: 0,
        cacheKey: null,
        operationalRetries: [],
      });
    }
    const persistedCheckpoint = await readAttemptCheckpoint(temporaryDirectory);
    expect(persistedCheckpoint.attemptId).toBe(skippedCheckpoint.attemptId);
    expect(persistedCheckpoint.stages).toStrictEqual(skippedCheckpoint.stages);
  });
});
