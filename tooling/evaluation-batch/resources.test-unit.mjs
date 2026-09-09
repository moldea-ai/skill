// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT,
  EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
} from './constants.mjs';
import {
  assertEvaluationWorkerTemporaryStorage,
  createEvaluationBatchDiskReservation,
  runWithEvaluationTemporaryStorageGuard,
} from './resources.mjs';

test('accepts exact one-worker and four-worker disk boundaries', () => {
  for (const workerCount of [1, 4]) {
    const reservedByteCount = workerCount * EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT;
    const reservation = createEvaluationBatchDiskReservation(
      workerCount,
      BigInt(reservedByteCount + EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT),
    );
    assert.equal(reservation.reservedByteCount, reservedByteCount);
    assert.equal(reservation.remainingByteCount, BigInt(EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT));
  }
});

test('rejects one byte below the free-space admission boundary', () => {
  assert.throws(
    () =>
      createEvaluationBatchDiskReservation(
        4,
        BigInt(
          4 * EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT +
            EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT -
            1,
        ),
      ),
    { name: 'EvaluationBatchDiskAdmissionError' },
  );
});

test('rejects worker storage above its exact byte ceiling', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-evaluation-resource-test-'));
  try {
    await writeFile(join(root, 'payload'), Buffer.alloc(8_192));
    await assert.rejects(assertEvaluationWorkerTemporaryStorage(root, 4_096), {
      name: 'EvaluationBatchDiskLimitError',
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('aborts an active boundary after temporary storage crosses its ceiling', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-evaluation-resource-test-'));
  try {
    await assert.rejects(
      runWithEvaluationTemporaryStorageGuard(
        root,
        async (signal) => {
          await writeFile(join(root, 'payload'), Buffer.alloc(8_192));
          await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
        },
        { maximumByteCount: 4_096, pollIntervalMs: 5 },
      ),
      { name: 'EvaluationBatchDiskLimitError' },
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('rejects an excluded subtree instead of leaving an unmeasured storage path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-evaluation-resource-test-'));
  try {
    await mkdir(join(root, '_archive'));
    await assert.rejects(assertEvaluationWorkerTemporaryStorage(root), {
      name: 'EvaluationBatchDiskLimitError',
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
