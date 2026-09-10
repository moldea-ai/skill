import { statfs } from 'node:fs/promises';
import path from 'node:path';

import {
  createEvaluationBatchDiskReservation,
  runWithEvaluationTemporaryStorageGuard,
  type IEvaluationBatchWorkerCount,
} from '../../../tooling/evaluation-batch/index.mjs';

/** Reserves the shared evaluator-owned temporary-storage envelope before dispatch. */
export const assertQualificationBatchDiskAdmission = async (
  workerCount: IEvaluationBatchWorkerCount,
  root: string,
): Promise<ReturnType<typeof createEvaluationBatchDiskReservation>> => {
  const statistics = await statfs(root, { bigint: true });
  return createEvaluationBatchDiskReservation(workerCount, statistics.bavail * statistics.bsize);
};

/** Runs one model boundary while measuring every directory owned by its qualification worker. */
export const runWithQualificationTemporaryStorageGuard = <TResult>(options: {
  attemptDirectory: string;
  internalTrialDirectory: string;
  operation: (signal: AbortSignal) => Promise<TResult>;
  publicTrialDirectory: string;
  signal?: AbortSignal;
  workspaceDirectory: string;
}): Promise<TResult> =>
  runWithEvaluationTemporaryStorageGuard(
    [
      options.workspaceDirectory,
      options.internalTrialDirectory,
      options.publicTrialDirectory,
      path.join(options.attemptDirectory, 'pnpm-store'),
      path.join(options.attemptDirectory, 'runtime'),
    ],
    (storageSignal) =>
      options.operation(
        options.signal === undefined
          ? storageSignal
          : AbortSignal.any([options.signal, storageSignal]),
      ),
  );
