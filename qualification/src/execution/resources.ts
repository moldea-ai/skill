import { statfs } from 'node:fs/promises';
import path from 'node:path';

import {
  createEvaluationBatchDiskReservation,
  runWithEvaluationTemporaryStorageGuard,
  type IEvaluationBatchWorkerCount,
} from '../../../tooling/evaluation-batch/index.mjs';
import { createQualificationPnpmInstallation } from '../pnpm-installation/index.ts';

type IQualificationTemporaryStoragePathsOptions = {
  attemptDirectory: string;
  internalTrialDirectory: string;
  publicTrialDirectory: string;
  workspaceDirectory: string;
};

/** Reserves the shared evaluator-owned temporary-storage envelope before dispatch. */
export const assertQualificationBatchDiskAdmission = async (
  workerCount: IEvaluationBatchWorkerCount,
  root: string,
): Promise<ReturnType<typeof createEvaluationBatchDiskReservation>> => {
  const statistics = await statfs(root, { bigint: true });
  return createEvaluationBatchDiskReservation(workerCount, statistics.bavail * statistics.bsize);
};

/**
 * Lists every attempt-owned directory measured around one qualification model stage.
 * @param options The active attempt and trial directories.
 * @returns Complete package, runtime, evidence, and workspace storage roots.
 */
export const createQualificationTemporaryStoragePaths = (
  options: IQualificationTemporaryStoragePathsOptions,
): string[] => {
  const pnpmInstallation = createQualificationPnpmInstallation(options.attemptDirectory);

  return [
    options.workspaceDirectory,
    options.internalTrialDirectory,
    options.publicTrialDirectory,
    pnpmInstallation.cacheDirectory,
    pnpmInstallation.storeDirectory,
    path.join(options.attemptDirectory, 'runtime'),
  ];
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
    createQualificationTemporaryStoragePaths(options),
    (storageSignal) =>
      options.operation(
        options.signal === undefined
          ? storageSignal
          : AbortSignal.any([options.signal, storageSignal]),
      ),
  );
