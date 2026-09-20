// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { writeJsonFileAtomically } from '../../filesystem/index.ts';
import {
  getSemanticCheckpointPath,
  readSemanticCheckpoint,
  writeSemanticCheckpoint,
} from './checkpoint.ts';
import type { ISemanticCandidateCheckpoint } from './types.ts';

const temporaryRoots: string[] = [];
const SHA256 = 'a'.repeat(64);

const createCheckpoint = (): ISemanticCandidateCheckpoint => ({
  actorHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'actor',
    version: '1.0.0',
  },
  artifactDigest: SHA256,
  attemptId: 'semantic-attempt',
  caseCheckpoints: {},
  cases: [],
  caseSuiteDigest: SHA256,
  cli: {
    integrity: 'sha512-synthetic',
    jsonSchemaVersion: 4,
    name: '@moldea.ai/cli',
    packageLockSha256: SHA256,
    version: '7.0.0',
  },
  coverageDigest: SHA256,
  createdAt: '2026-09-19T12:00:00.000Z',
  judgeHost: {
    developerInstructionsSha256: SHA256,
    model: 'synthetic-model',
    name: 'synthetic-host',
    reasoningEffort: 'high',
    role: 'judge',
    version: '1.0.0',
  },
  mode: 'official',
  schemaVersion: 2,
  selectedCaseIds: ['case-one', 'case-two'],
  updatedAt: '2026-09-19T12:00:00.000Z',
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('semantic checkpoint storage', () => {
  test('round trips exact run identity for interrupted-run recovery', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
    temporaryRoots.push(root);
    const checkpoint = createCheckpoint();

    await writeSemanticCheckpoint(root, checkpoint);

    await expect(readSemanticCheckpoint(root)).resolves.toStrictEqual(checkpoint);
  });

  test('rejects duplicate selected ids before resuming', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
    temporaryRoots.push(root);
    await writeJsonFileAtomically(getSemanticCheckpointPath(root), {
      ...createCheckpoint(),
      selectedCaseIds: ['case-one', 'case-one'],
    });

    await expect(readSemanticCheckpoint(root)).rejects.toThrow(/unique/u);
  });

  test('retains a terminally stopped actor boundary for explicit recovery', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-semantic-checkpoint-'));
    temporaryRoots.push(root);
    const checkpoint = createCheckpoint();
    checkpoint.caseCheckpoints['case-one'] = {
      activeTrial: {
        actorEvidence: null,
        confirmationIndex: null,
        operationalRetries: {
          actorFailureCount: 2,
          judgeFailureCount: 0,
          lastFailure: {
            category: 'timed-out',
            failedAt: '2026-09-19T12:01:00.000Z',
            isExhausted: true,
            stage: 'actor',
          },
        },
        phase: 'actor-pending',
        recordedTrial: null,
        startedAt: '2026-09-19T12:00:30.000Z',
        updatedAt: '2026-09-19T12:01:00.000Z',
      },
      caseDefinitionDigest: SHA256,
      caseId: 'case-one',
      completedCase: null,
      trials: [],
    };

    await writeSemanticCheckpoint(root, checkpoint);

    await expect(readSemanticCheckpoint(root)).resolves.toStrictEqual(checkpoint);
  });
});
