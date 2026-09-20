import { lstat, readdir, statfs } from 'node:fs/promises';
import { join } from 'node:path';

import {
  EVALUATION_BATCH_MAXIMUM_TEMPORARY_BYTE_COUNT,
  EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT,
  EVALUATION_BATCH_WORKER_COUNTS,
  EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
} from './constants.ts';
import type {
  IEvaluationBatchWorkerCount,
  IEvaluationTemporaryStorageGuardOptions,
} from './types.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

const hasNodeErrorCode = (error: unknown, code: string): boolean =>
  error instanceof Error && 'code' in error && error.code === code;

const normalizeEvaluationError = (error: unknown, message: string): Error =>
  error instanceof Error ? error : new Error(message, { cause: error });

const getAllocatedByteCount = (statistics: Awaited<ReturnType<typeof lstat>>): bigint => {
  const blockCount = statistics.blocks;
  if (typeof blockCount === 'bigint' && blockCount > 0n) return blockCount * 512n;
  return BigInt(statistics.size);
};

/**
 * Measures allocated bytes without following links or reading file content.
 * @param root The filesystem path to measure.
 * @returns A promise resolving to the allocated byte count.
 */
export const getEvaluationTemporaryByteCount = async (root: string): Promise<bigint> => {
  let statistics: Awaited<ReturnType<typeof lstat>>;
  try {
    statistics = await lstat(root, { bigint: true });
  } catch (error) {
    if (hasNodeErrorCode(error, 'ENOENT')) return 0n;
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

const getEvaluationTemporaryRoots = (root: string | readonly string[]): readonly string[] =>
  typeof root === 'string' ? [root] : root;

const getAvailableByteCount = async (root: string): Promise<bigint> => {
  const statistics = await statfs(root, { bigint: true });
  return statistics.bavail * statistics.bsize;
};

const assertEvaluationAvailableStorage = async (
  root: string,
  minimumFreeByteCount: number,
  inspectAvailableByteCount: (candidateRoot: string) => Promise<bigint>,
): Promise<void> => {
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

/**
 * Rejects one worker's roots when their combined allocated storage exceeds its fixed ceiling.
 * @param root One temporary root or the complete set of roots owned by one worker.
 * @param maximumByteCount The maximum combined allocated bytes.
 * @returns A promise resolving to the measured allocated bytes.
 */
export const assertEvaluationWorkerTemporaryStorage = async (
  root: string | readonly string[],
  maximumByteCount = EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
): Promise<bigint> => {
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

/**
 * Runs one model boundary with exact size checks and constant-cost free-space monitoring.
 * @param root One temporary root or the complete set of roots owned by one worker.
 * @param operation The model operation protected by the storage guard.
 * @param options Storage ceilings and inspection behavior.
 * @returns A promise resolving to the model operation result.
 */
export const runWithEvaluationTemporaryStorageGuard = async <TResult>(
  root: string | readonly string[],
  operation: (signal: AbortSignal) => Promise<TResult>,
  {
    inspectAvailableByteCount = getAvailableByteCount,
    maximumByteCount = EVALUATION_BATCH_WORKER_TEMPORARY_BYTE_COUNT,
    minimumFreeByteCount = EVALUATION_BATCH_MINIMUM_FREE_BYTE_COUNT,
    pollIntervalMs = 1_000,
  }: IEvaluationTemporaryStorageGuardOptions = {},
): Promise<TResult> => {
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
  if (storageRoot === undefined) {
    throw new Error('Evaluation worker temporary roots must contain at least one path.');
  }
  await Promise.all([
    assertEvaluationWorkerTemporaryStorage(roots, maximumByteCount),
    assertEvaluationAvailableStorage(storageRoot, minimumFreeByteCount, inspectAvailableByteCount),
  ]);
  const controller = new AbortController();
  let activeCheck: Promise<void> | null = null;
  let limitError: unknown = null;
  const check = (): void => {
    if (activeCheck !== null || limitError !== null) return;
    activeCheck = assertEvaluationAvailableStorage(
      storageRoot,
      minimumFreeByteCount,
      inspectAvailableByteCount,
    )
      .catch((error: unknown) => {
        limitError = error;
        controller.abort(error);
      })
      .finally(() => {
        activeCheck = null;
      });
  };
  const interval = setInterval(check, pollIntervalMs);

  let operationError: unknown = null;
  let result: TResult | undefined;
  try {
    result = await operation(controller.signal);
  } catch (error) {
    operationError = error;
  } finally {
    clearInterval(interval);
    if (activeCheck !== null) await Promise.resolve(activeCheck);
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
  if (limitError !== null) {
    throw normalizeEvaluationError(limitError, 'Evaluation storage inspection failed.');
  }
  if (operationError !== null) {
    throw normalizeEvaluationError(operationError, 'Evaluation operation failed.');
  }
  return result as TResult;
};

/**
 * Reserves bounded temporary storage before an evaluation batch starts.
 * @param workerCount The requested closed worker count.
 * @param availableByteCount Free bytes on the task-owned filesystem.
 * @returns The accepted reservation and remaining free-space evidence.
 */
export const createEvaluationBatchDiskReservation = (
  workerCount: IEvaluationBatchWorkerCount,
  availableByteCount: bigint | number,
): {
  availableByteCount: bigint;
  minimumFreeByteCount: number;
  remainingByteCount: bigint;
  reservedByteCount: number;
  workerCount: IEvaluationBatchWorkerCount;
} => {
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
