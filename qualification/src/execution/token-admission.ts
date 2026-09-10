import {
  EVALUATION_BATCH_WORKER_COUNTS,
  type IEvaluationBatchWorkerCount,
} from '../../../tooling/evaluation-batch/index.mjs';

import type { IModelUsage } from '../contracts/index.ts';
import {
  getQualificationMaximumTokenCount,
  getQualificationModelUsageTokenCount,
  QualificationCandidateTokenLimitError,
} from './stages.ts';
import type { IQualificationBatchTokenController } from './types.ts';

/** Creates a synchronous reservation controller shared by one bounded qualification batch. */
export const createQualificationBatchTokenController = (options: {
  initialTokensConsumed?: number;
  totalTokenLimit?: number | null;
  workerCount: IEvaluationBatchWorkerCount;
}): IQualificationBatchTokenController => {
  if (!EVALUATION_BATCH_WORKER_COUNTS.includes(options.workerCount)) {
    throw new Error('Qualification worker count must be 1, 2, or 4.');
  }
  const reservationTokenCount = getQualificationMaximumTokenCount(1);
  const inFlightTokenLimit = options.workerCount * reservationTokenCount;
  const totalTokenLimit = options.totalTokenLimit ?? null;
  let tokensConsumed = options.initialTokensConsumed ?? 0;
  let tokensReserved = 0;

  if (!Number.isSafeInteger(tokensConsumed) || tokensConsumed < 0) {
    throw new Error('Initial qualification batch token consumption must be non-negative.');
  }

  const reserve = (): void => {
    if (tokensReserved + reservationTokenCount > inFlightTokenLimit) {
      throw new QualificationCandidateTokenLimitError(
        `Qualification in-flight token admission reached ${tokensReserved} reserved tokens; ` +
          `${reservationTokenCount} more would exceed the ${inFlightTokenLimit}-token batch ceiling.`,
      );
    }
    if (
      totalTokenLimit !== null &&
      tokensConsumed + tokensReserved + reservationTokenCount > totalTokenLimit
    ) {
      throw new QualificationCandidateTokenLimitError(
        `Qualification batch token admission reached ${tokensConsumed} consumed and ` +
          `${tokensReserved} reserved tokens; ${reservationTokenCount} more would exceed ` +
          `the ${totalTokenLimit}-token total ceiling.`,
      );
    }
    tokensReserved += reservationTokenCount;
  };

  const release = (): void => {
    if (tokensReserved < reservationTokenCount) {
      throw new Error('Qualification batch has no complete token reservation to release.');
    }
    tokensReserved -= reservationTokenCount;
  };

  const settle = (usage: IModelUsage | null): void => {
    release();
    tokensConsumed +=
      usage === null ? reservationTokenCount : getQualificationModelUsageTokenCount(usage);
  };

  return {
    getSnapshot: () => ({
      inFlightTokenLimit,
      reservationTokenCount,
      tokensConsumed,
      tokensReserved,
      totalTokenLimit,
    }),
    release,
    reserve,
    settle,
  };
};
