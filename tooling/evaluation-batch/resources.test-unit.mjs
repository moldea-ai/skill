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

test('applies one worker ceiling across multiple isolated roots', async () => {
  const firstRoot = await mkdtemp(join(tmpdir(), 'moldea-evaluation-resource-test-'));
  const secondRoot = await mkdtemp(join(tmpdir(), 'moldea-evaluation-resource-test-'));
  try {
    await Promise.all([
      writeFile(join(firstRoot, 'first'), Buffer.alloc(4_096)),
      writeFile(join(secondRoot, 'second'), Buffer.alloc(4_096)),
    ]);
    await assert.rejects(assertEvaluationWorkerTemporaryStorage([firstRoot, secondRoot], 4_096), {
      name: 'EvaluationBatchDiskLimitError',
    });
  } finally {
    await Promise.all([
      rm(firstRoot, { force: true, recursive: true }),
      rm(secondRoot, { force: true, recursive: true }),
    ]);
  }
});

test('rejects temporary storage that crosses its ceiling during a model boundary', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-evaluation-resource-test-'));
  try {
    await assert.rejects(
      runWithEvaluationTemporaryStorageGuard(
        root,
        async () => {
          await writeFile(join(root, 'payload'), Buffer.alloc(8_192));
        },
        { maximumByteCount: 4_096 },
      ),
      { name: 'EvaluationBatchDiskLimitError' },
    );
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('aborts an active boundary when the filesystem crosses its free-space floor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-evaluation-resource-test-'));
  let inspectionCount = 0;
  try {
    await assert.rejects(
      runWithEvaluationTemporaryStorageGuard(
        root,
        async (signal) => {
          await new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
        },
        {
          inspectAvailableByteCount: async () => {
            inspectionCount += 1;
            return inspectionCount === 1 ? 8_192n : 0n;
          },
          minimumFreeByteCount: 4_096,
          pollIntervalMs: 5,
        },
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
