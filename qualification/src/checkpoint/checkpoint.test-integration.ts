// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { QualificationAttemptCheckpointSchema } from '../contracts/index.ts';
import {
  createAttemptCheckpoint,
  normalizeInterruptedCheckpoint,
  readAttemptCheckpoint,
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
      useCache: true,
      packagesRepository: '/packages',
      skillRepository: '/skill',
      profileDigest: 'a'.repeat(64),
      qualificationDigest: 'd'.repeat(64),
      skillDigest: 'b'.repeat(64),
      packagesRepositoryFingerprint: 'e'.repeat(64),
      packagesDigest: 'c'.repeat(64),
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
});
