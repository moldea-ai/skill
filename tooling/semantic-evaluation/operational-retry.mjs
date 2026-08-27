import { isRetryableCodexEvaluationHostError } from '../codex-evaluation-host/index.mjs';

const INITIAL_OPERATIONAL_RETRY_DELAY_MS = 5_000;
const MAXIMUM_OPERATIONAL_RETRY_DELAY_MS = 60_000;

/** Calculates a capped exponential delay with bounded jitter for one operational retry. */
export const calculateSemanticOperationalRetryDelay = (
  failureCount,
  randomValue = Math.random(),
) => {
  if (!Number.isSafeInteger(failureCount) || failureCount < 1) {
    throw new Error('Semantic operational retry failureCount must be a positive integer.');
  }
  if (typeof randomValue !== 'number' || randomValue < 0 || randomValue > 1) {
    throw new Error('Semantic operational retry randomValue must be between zero and one.');
  }

  const exponentialDelay = Math.min(
    MAXIMUM_OPERATIONAL_RETRY_DELAY_MS,
    INITIAL_OPERATIONAL_RETRY_DELAY_MS * 2 ** Math.min(failureCount - 1, 8),
  );
  const minimumDelay = exponentialDelay * 0.75;
  return Math.round(minimumDelay + exponentialDelay * 0.25 * randomValue);
};

/** Waits for one operational retry delay. */
const waitForSemanticOperationalRetry = (delayMs) =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));

/**
 * Repeats one model-host stage until it succeeds or returns a non-operational failure.
 * @param options The stage operation, persistence callback, and injectable timing seams.
 * @returns A promise resolving to the successful stage result.
 * @throws
 * - If retry state is invalid or the operation returns a non-retryable failure
 */
export const runSemanticOperationalStage = async ({
  initialFailureCount = 0,
  now = () => new Date().toISOString(),
  onRetry,
  operation,
  random = Math.random,
  wait = waitForSemanticOperationalRetry,
}) => {
  if (!Number.isSafeInteger(initialFailureCount) || initialFailureCount < 0) {
    throw new Error(
      'Semantic operational retry initialFailureCount must be a non-negative integer.',
    );
  }

  let failureCount = initialFailureCount;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableCodexEvaluationHostError(error)) throw error;

      failureCount += 1;
      const retryDelayMs = calculateSemanticOperationalRetryDelay(failureCount, random());
      await onRetry({
        category: error.kind,
        failedAt: now(),
        failureCount,
        retryDelayMs,
      });
      await wait(retryDelayMs);
    }
  }
};
