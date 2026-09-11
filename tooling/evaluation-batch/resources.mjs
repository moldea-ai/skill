import { lstat, readdir, statfs } from 'node:fs/promises';
import { join } from 'node:path';

import {
  EVALUATION_BATCH_MAXIMUM_TEMPORARY_BYTE_COUNT,
  EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT,
  EVALUATION_BATCH_WORKER_COUNTS,
  EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
} from './constants.mjs';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

const getAllocatedByteCount = (statistics) => {
  if (typeof statistics.blocks === 'bigint' && statistics.blocks > 0n) {
    return statistics.blocks * 512n;
  }
  return statistics.size;
};

/** Measures allocated bytes without following links or reading file content. */
export const getEvaluationTemporaryByteCount = async (root) => {
  let statistics;
  try {
    statistics = await lstat(root, { bigint: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return 0n;
    throw error;
  }
  let byteCount = getAllocatedByteCount(statistics);
  if (!statistics.isDirectory()) return byteCount;

  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
      const error = new Error(
        `Evaluation worker temporary storage contains excluded directory ${entry.name}.`,
      );
      error.name = 'EvaluationBatchDiskLimitError';
      throw error;
    }
    byteCount += await getEvaluationTemporaryByteCount(join(root, entry.name));
  }
  return byteCount;
};

const getEvaluationTemporaryRoots = (root) => (Array.isArray(root) ? root : [root]);

const getAvailableByteCount = async (root) => {
  const statistics = await statfs(root, { bigint: true });
  return statistics.bavail * statistics.bsize;
};

const assertEvaluationAvailableStorage = async (
  root,
  minimumFreeByteCount,
  inspectAvailableByteCount,
) => {
  const availableByteCount = await inspectAvailableByteCount(root);
  if (availableByteCount < BigInt(minimumFreeByteCount)) {
    const error = new Error(
      `Evaluation filesystem has ${availableByteCount} available bytes; ` +
        `the required free-space floor is ${minimumFreeByteCount} bytes.`,
    );
    error.name = 'EvaluationBatchDiskLimitError';
    throw error;
  }
};

/** Rejects one worker's roots whose combined allocated storage exceeds its fixed ceiling. */
export const assertEvaluationWorkerTemporaryStorage = async (
  root,
  maximumByteCount = EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
) => {
  if (!Number.isSafeInteger(maximumByteCount) || maximumByteCount <= 0) {
    throw new Error('Evaluation worker temporary byte limit must be a positive integer.');
  }
  const roots = getEvaluationTemporaryRoots(root);
  if (roots.length === 0 || roots.some((candidateRoot) => typeof candidateRoot !== 'string')) {
    throw new Error('Evaluation worker temporary roots must contain at least one path.');
  }
  const byteCount = (
    await Promise.all(roots.map((candidateRoot) => getEvaluationTemporaryByteCount(candidateRoot)))
  ).reduce((total, candidateByteCount) => total + candidateByteCount, 0n);
  if (byteCount > BigInt(maximumByteCount)) {
    const error = new Error(
      `Evaluation worker temporary storage reached ${byteCount} bytes; the limit is ${maximumByteCount} bytes.`,
    );
    error.name = 'EvaluationBatchDiskLimitError';
    throw error;
  }
  return byteCount;
};

/** Runs one model boundary with exact size checks and constant-cost free-space monitoring. */
export const runWithEvaluationTemporaryStorageGuard = async (
  root,
  operation,
  {
    inspectAvailableByteCount = getAvailableByteCount,
    maximumByteCount = EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
    minimumFreeByteCount = EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT,
    pollIntervalMs = 1_000,
  } = {},
) => {
  if (typeof operation !== 'function') {
    throw new Error('Evaluation temporary-storage guard requires an operation callback.');
  }
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new Error('Evaluation temporary-storage poll interval must be a positive integer.');
  }
  if (!Number.isSafeInteger(minimumFreeByteCount) || minimumFreeByteCount < 0) {
    throw new Error('Evaluation minimum free byte count must be a non-negative integer.');
  }
  if (typeof inspectAvailableByteCount !== 'function') {
    throw new Error('Evaluation available-storage inspector must be a function.');
  }
  const roots = getEvaluationTemporaryRoots(root);
  if (roots.length === 0 || roots.some((candidateRoot) => typeof candidateRoot !== 'string')) {
    throw new Error('Evaluation worker temporary roots must contain at least one path.');
  }
  const storageRoot = roots[0];
  await Promise.all([
    assertEvaluationWorkerTemporaryStorage(roots, maximumByteCount),
    assertEvaluationAvailableStorage(storageRoot, minimumFreeByteCount, inspectAvailableByteCount),
  ]);
  const controller = new AbortController();
  let activeCheck = null;
  let limitError = null;
  const check = () => {
    if (activeCheck !== null || limitError !== null) return;
    activeCheck = assertEvaluationAvailableStorage(
      storageRoot,
      minimumFreeByteCount,
      inspectAvailableByteCount,
    )
      .catch((error) => {
        limitError = error;
        controller.abort(error);
      })
      .finally(() => {
        activeCheck = null;
      });
  };
  const interval = setInterval(check, pollIntervalMs);

  let operationError = null;
  let result;
  try {
    result = await operation(controller.signal);
  } catch (error) {
    operationError = error;
  } finally {
    clearInterval(interval);
    if (activeCheck !== null) await activeCheck;
    try {
      await Promise.all([
        assertEvaluationWorkerTemporaryStorage(roots, maximumByteCount),
        assertEvaluationAvailableStorage(
          storageRoot,
          minimumFreeByteCount,
          inspectAvailableByteCount,
        ),
      ]);
    } catch (error) {
      limitError ??= error;
    }
  }
  if (limitError !== null) throw limitError;
  if (operationError !== null) throw operationError;
  return result;
};

/**
 * Reserves bounded temporary storage before an evaluation batch starts.
 * @param workerCount The requested closed worker count.
 * @param availableByteCount Free bytes on the task-owned filesystem.
 * @returns The accepted reservation and remaining free-space evidence.
 */
export const createEvaluationBatchDiskReservation = (workerCount, availableByteCount) => {
  if (!EVALUATION_BATCH_WORKER_COUNTS.includes(workerCount)) {
    throw new Error('Evaluation worker count must be 1, 2, or 4.');
  }
  const availableBytes =
    typeof availableByteCount === 'bigint' ? availableByteCount : BigInt(availableByteCount);
  if (availableBytes < 0n) {
    throw new Error('Evaluation available disk bytes must be non-negative.');
  }

  const reservedByteCount = workerCount * EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT;
  if (reservedByteCount > EVALUATION_BATCH_MAXIMUM_TEMPORARY_BYTE_COUNT) {
    throw new Error('Evaluation temporary storage reservation exceeds its aggregate ceiling.');
  }
  const remainingByteCount = availableBytes - BigInt(reservedByteCount);
  if (remainingByteCount < BigInt(EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT)) {
    const error = new Error(
      `Evaluation batch requires ${reservedByteCount} temporary bytes while preserving ` +
        `${EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT} free bytes; ${availableBytes} bytes are available.`,
    );
    error.name = 'EvaluationBatchDiskAdmissionError';
    throw error;
  }

  return {
    availableByteCount: availableBytes,
    minimumFreeByteCount: EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT,
    remainingByteCount,
    reservedByteCount,
    workerCount,
  };
};
