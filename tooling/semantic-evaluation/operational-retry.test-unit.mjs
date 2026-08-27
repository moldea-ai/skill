// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CodexEvaluationHostError,
} from '../codex-evaluation-host/index.mjs';

import {
  calculateSemanticOperationalRetryDelay,
  runSemanticOperationalStage,
} from './operational-retry.mjs';

test('operational retry delay grows exponentially and remains capped with bounded jitter', () => {
  assert.equal(calculateSemanticOperationalRetryDelay(1, 0), 3_750);
  assert.equal(calculateSemanticOperationalRetryDelay(1, 1), 5_000);
  assert.equal(calculateSemanticOperationalRetryDelay(2, 0), 7_500);
  assert.equal(calculateSemanticOperationalRetryDelay(8, 1), 60_000);
  assert.throws(
    () => calculateSemanticOperationalRetryDelay(0),
    /failureCount must be a positive integer/,
  );
  assert.throws(
    () => calculateSemanticOperationalRetryDelay(1, 2),
    /randomValue must be between zero and one/,
  );
});

test('operational stage persists every retry and eventually returns the successful result', async () => {
  const retries = [];
  const delays = [];
  let operationCount = 0;

  const result = await runSemanticOperationalStage({
    now: () => `2026-08-27T16:00:0${operationCount}.000Z`,
    onRetry: async (retry) => retries.push(retry),
    operation: async () => {
      operationCount += 1;
      if (operationCount < 3) {
        throw new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
          'Provider request failed.',
        );
      }
      return 'completed';
    },
    random: () => 1,
    wait: async (delayMs) => delays.push(delayMs),
  });

  assert.equal(result, 'completed');
  assert.equal(operationCount, 3);
  assert.deepEqual(delays, [5_000, 10_000]);
  assert.deepEqual(retries, [
    {
      category: CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
      failedAt: '2026-08-27T16:00:01.000Z',
      failureCount: 1,
      retryDelayMs: 5_000,
    },
    {
      category: CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
      failedAt: '2026-08-27T16:00:02.000Z',
      failureCount: 2,
      retryDelayMs: 10_000,
    },
  ]);
});

test('operational stage resumes retry accounting from persisted failure evidence', async () => {
  const retries = [];

  const result = await runSemanticOperationalStage({
    initialFailureCount: 2,
    now: () => '2026-08-27T16:01:00.000Z',
    onRetry: async (retry) => retries.push(retry),
    operation: async () => {
      if (retries.length === 0) {
        throw new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
          'Provider request timed out.',
        );
      }
      return 'resumed';
    },
    random: () => 1,
    wait: async () => {},
  });

  assert.equal(result, 'resumed');
  assert.deepEqual(retries, [
    {
      category: CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
      failedAt: '2026-08-27T16:01:00.000Z',
      failureCount: 3,
      retryDelayMs: 20_000,
    },
  ]);
});

test('operational stage does not retry deterministic host failures', async () => {
  let retryCount = 0;

  await assert.rejects(
    runSemanticOperationalStage({
      onRetry: async () => {
        retryCount += 1;
      },
      operation: async () => {
        throw new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.OutputLimit,
          'Host output exceeded its limit.',
        );
      },
      wait: async () => {},
    }),
    /Host output exceeded its limit/,
  );
  assert.equal(retryCount, 0);
});
