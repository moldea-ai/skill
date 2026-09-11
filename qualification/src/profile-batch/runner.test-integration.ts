// @vitest-environment node
import { access, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { FakeCodexHost } from '../codex-host/index.ts';
import { getLocalAttemptDirectory } from '../execution/index.ts';
import {
  readQualificationProfileBatchState,
  runQualificationProfileBatch,
  writeQualificationProfileBatchState,
} from './runner.ts';
import { QualificationProfileBatchLedgerSchema } from './types.ts';

describe('qualification profile-batch execution', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) await rm(temporaryRoot, { force: true, recursive: true });
  });

  test('runs isolated dry-run targets concurrently and commits summaries in profile order', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-profile-batch-'));
    const checkpointPath = path.join(temporaryRoot, 'checkpoint.json');
    const ledgerPath = path.join(temporaryRoot, 'ledger.json');
    const historyRoot = path.join(temporaryRoot, 'history');
    const resultsRoot = path.join(temporaryRoot, 'results');
    const targetIds = [
      'anthropic/typescript-messages-api-0-117',
      'claude-agent-sdk/typescript-query-subagents-0-3',
    ];
    const outcome = await runQualificationProfileBatch({
      host: new FakeCodexHost(),
      selector: { kind: 'targets', value: targetIds.join(',') },
      checkpointPath,
      ledgerPath,
      historyRoot,
      resultsRoot,
      isDryRun: true,
      workerCount: 2,
    });

    expect(outcome).toMatchObject({
      status: 'completed',
      selector: { kind: 'targets', targetIds },
      activeAttemptIds: [],
      candidateTokensConsumed: 0,
    });
    expect(
      outcome.records.map(({ adapterId, implementationId, modelCallCount, status }) => ({
        targetId: `${adapterId}/${implementationId}`,
        modelCallCount,
        status,
      })),
    ).toStrictEqual(
      targetIds.map((targetId) => ({ targetId, modelCallCount: 0, status: 'passed' })),
    );
    await expect(access(checkpointPath)).rejects.toThrow();
    await expect(access(ledgerPath)).rejects.toThrow();
    await expect(access(resultsRoot)).rejects.toThrow();

    const history = await readQualificationProfileBatchState(
      path.join(historyRoot, `${outcome.batchId}.json`),
      QualificationProfileBatchLedgerSchema,
    );
    expect(history?.records).toStrictEqual(outcome.records);
    for (const record of outcome.records) {
      await expect(access(getLocalAttemptDirectory(record.attemptId))).rejects.toThrow();
    }
  }, 120_000);

  test('rejects unknown logical targets before creating batch state', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-profile-batch-'));
    const checkpointPath = path.join(temporaryRoot, 'checkpoint.json');
    await expect(
      runQualificationProfileBatch({
        host: new FakeCodexHost(),
        selector: { kind: 'targets', value: 'unknown/unknown' },
        checkpointPath,
        ledgerPath: path.join(temporaryRoot, 'ledger.json'),
        historyRoot: path.join(temporaryRoot, 'history'),
        resultsRoot: path.join(temporaryRoot, 'results'),
        isDryRun: true,
      }),
    ).rejects.toThrow('Unknown qualification targets: unknown/unknown.');
    await expect(access(checkpointPath)).rejects.toThrow();
  });

  test('runs only unresolved logical targets from one completed batch ledger', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-profile-batch-'));
    const historyRoot = path.join(temporaryRoot, 'history');
    const sourceBatchId = `b-${'a'.repeat(32)}`;
    const targetIds = [
      'anthropic/typescript-messages-api-0-117',
      'openai/typescript-responses-api-7',
    ];
    await writeQualificationProfileBatchState(path.join(historyRoot, `${sourceBatchId}.json`), {
      schemaVersion: 1,
      batchId: sourceBatchId,
      identitySha256: 'b'.repeat(64),
      selector: { kind: 'targets', value: targetIds.join(','), targetIds },
      isDryRun: true,
      records: [
        {
          schemaVersion: 1,
          attemptId: 'passing-source-attempt',
          adapterId: 'anthropic',
          implementationId: 'typescript-messages-api-0-117',
          status: 'passed',
          summary: 'Qualification passed.',
          caseCount: 2,
          failedCaseCount: 0,
          recoveredCaseCount: 0,
          modelCallCount: 0,
          modelTokenCount: 0,
          candidateTokensConsumed: 0,
          durationMs: 1,
        },
      ],
      candidateTokensConsumed: 0,
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    });

    const outcome = await runQualificationProfileBatch({
      host: new FakeCodexHost(),
      selector: { kind: 'unresolved-from', value: sourceBatchId },
      checkpointPath: path.join(temporaryRoot, 'checkpoint.json'),
      ledgerPath: path.join(temporaryRoot, 'ledger.json'),
      historyRoot,
      resultsRoot: path.join(temporaryRoot, 'results'),
      isDryRun: true,
      workerCount: 1,
    });

    expect(outcome).toMatchObject({
      status: 'completed',
      selector: {
        kind: 'unresolved-from',
        value: sourceBatchId,
        targetIds: ['openai/typescript-responses-api-7'],
      },
    });
    expect(
      outcome.records.map(({ adapterId, implementationId }) => `${adapterId}/${implementationId}`),
    ).toStrictEqual(['openai/typescript-responses-api-7']);
  }, 120_000);

  test('refuses the complete adapter batch before dispatch when Custom evidence is absent', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-profile-batch-'));
    const checkpointPath = path.join(temporaryRoot, 'checkpoint.json');
    const attemptsRoot = path.join(
      path.resolve(import.meta.dirname, '../../..'),
      '.runtime-qualification',
      'attempts',
    );
    const readAttemptNames = async (): Promise<string[]> => {
      try {
        return await readdir(attemptsRoot);
      } catch {
        return [];
      }
    };
    const attemptNamesBefore = await readAttemptNames();

    await expect(
      runQualificationProfileBatch({
        host: new FakeCodexHost(),
        selector: { kind: 'all', value: null },
        checkpointPath,
        ledgerPath: path.join(temporaryRoot, 'ledger.json'),
        historyRoot: path.join(temporaryRoot, 'history'),
        resultsRoot: path.join(temporaryRoot, 'results'),
        isDryRun: false,
        workerCount: 4,
      }),
    ).rejects.toThrow('Adapter qualification requires an exact passing Custom baseline');
    await expect(access(checkpointPath)).rejects.toThrow();

    const attemptNamesAfter = await readAttemptNames();
    expect(attemptNamesAfter).toStrictEqual(attemptNamesBefore);
  }, 120_000);
});
