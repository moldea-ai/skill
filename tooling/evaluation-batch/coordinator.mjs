import { EVALUATION_BATCH_WORKER_COUNTS } from './constants.mjs';

const createDeferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

/**
 * Runs isolated items concurrently and commits their results in input order.
 * @param options The bounded worker, execution, commit, and stop callbacks.
 * @returns A promise resolving to committed values in deterministic input order.
 * @throws
 * - The first execution or commit failure after active siblings finish safely
 */
export const runOrderedEvaluationBatch = async ({
  commitItem,
  executeItem,
  items,
  onItemError = async () => {},
  workerCount,
}) => {
  if (!Array.isArray(items)) throw new Error('Evaluation batch items must be an array.');
  if (!EVALUATION_BATCH_WORKER_COUNTS.includes(workerCount)) {
    throw new Error('Evaluation worker count must be 1, 2, or 4.');
  }
  if (typeof executeItem !== 'function' || typeof commitItem !== 'function') {
    throw new Error('Evaluation batch requires execute and commit callbacks.');
  }

  const committedValues = [];
  const completedItems = new Map();
  const completionBarriers = new Map();
  let commitQueue = Promise.resolve();
  let firstFailure = null;
  let nextCommitIndex = 0;
  let nextExecutionIndex = 0;

  const serializeCommit = (operation) => {
    const queuedOperation = commitQueue.then(operation, operation);
    commitQueue = queuedOperation.catch(() => {});
    return queuedOperation;
  };

  const releaseCompletionBarriers = () => {
    for (const barrier of completionBarriers.values()) barrier.resolve();
    completionBarriers.clear();
  };

  const reportFailure = async (failure) => {
    try {
      await onItemError(failure);
    } catch (checkpointError) {
      failure.error = new AggregateError(
        [failure.error, checkpointError],
        'Evaluation batch failed and its stop checkpoint could not be persisted.',
      );
    }
  };

  const commitAvailableItems = async () => {
    while (firstFailure === null && completedItems.has(nextCommitIndex)) {
      const completedItem = completedItems.get(nextCommitIndex);
      try {
        await commitItem(completedItem);
      } catch (error) {
        firstFailure = { error, index: nextCommitIndex, item: completedItem.item };
        await reportFailure(firstFailure);
        releaseCompletionBarriers();
        return;
      }
      completedItems.delete(nextCommitIndex);
      committedValues.push(completedItem.value);
      completionBarriers.get(nextCommitIndex)?.resolve();
      completionBarriers.delete(nextCommitIndex);
      nextCommitIndex += 1;
    }
  };

  const runWorker = async () => {
    while (firstFailure === null) {
      const index = nextExecutionIndex;
      if (index >= items.length) return;
      nextExecutionIndex += 1;
      const item = items[index];
      const barrier = createDeferred();
      completionBarriers.set(index, barrier);

      try {
        const value = await executeItem({ index, item });
        await serializeCommit(async () => {
          completedItems.set(index, { index, item, value });
          await commitAvailableItems();
          if (firstFailure !== null) releaseCompletionBarriers();
        });
      } catch (error) {
        await serializeCommit(async () => {
          if (firstFailure === null) {
            firstFailure = { error, index, item };
            await commitAvailableItems();
            await reportFailure(firstFailure);
          }
          releaseCompletionBarriers();
        });
      }

      await barrier.promise;
    }
  };

  await Promise.all(Array.from({ length: Math.min(workerCount, items.length) }, () => runWorker()));
  await commitQueue;
  if (firstFailure !== null) throw firstFailure.error;
  return committedValues;
};
