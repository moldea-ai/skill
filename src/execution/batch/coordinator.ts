import { runInOrder } from 'jg-utilities';

import { EVALUATION_BATCH_WORKER_COUNTS } from './constants.ts';
import type { IEvaluationBatchFailure, IEvaluationBatchOptions } from './types.ts';

/**
 * Runs isolated items concurrently and commits their results in input order.
 * @param options The bounded worker, execution, commit, and stop callbacks.
 * @returns A promise resolving to committed values in deterministic input order.
 * @throws
 * - The first execution or commit failure after active siblings finish safely
 */
export const runOrderedEvaluationBatch = async <TItem, TValue>({
  commitItem,
  executeItem,
  items,
  onItemError = async () => {},
  workerCount,
}: IEvaluationBatchOptions<TItem, TValue>): Promise<TValue[]> => {
  if (!Array.isArray(items)) throw new Error('Evaluation batch items must be an array.');
  if (!EVALUATION_BATCH_WORKER_COUNTS.includes(workerCount)) {
    throw new Error('Evaluation worker count must be 1, 2, or 4.');
  }
  if (typeof executeItem !== 'function' || typeof commitItem !== 'function') {
    throw new Error('Evaluation batch requires execute and commit callbacks.');
  }

  // the first failure with its item, for the stop checkpoint
  let firstFailure: IEvaluationBatchFailure<TItem> | null = null;
  const recordFailure = (error: unknown, index: number, item: TItem): never => {
    firstFailure ??= { error, index, item };
    throw error;
  };

  try {
    return await runInOrder(items, {
      concurrency: workerCount,
      execute: async (item, index) => {
        try {
          return await executeItem({ index, item });
        } catch (error) {
          return recordFailure(error, index, item);
        }
      },
      commit: async (value, item, index) => {
        try {
          await commitItem({ index, item, value });
        } catch (error) {
          recordFailure(error, index, item);
        }
      },
    });
  } catch (error) {
    const failure = firstFailure as IEvaluationBatchFailure<TItem> | null;
    if (failure === null) throw error;
    try {
      await onItemError(failure);
    } catch (checkpointError) {
      throw new AggregateError(
        [failure.error, checkpointError],
        'Evaluation batch failed and its stop checkpoint could not be persisted.',
        { cause: checkpointError },
      );
    }
    throw failure.error;
  }
};
