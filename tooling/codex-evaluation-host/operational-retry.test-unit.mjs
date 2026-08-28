// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import { CODEX_EVALUATION_HOST_FAILURE_KINDS, CodexEvaluationHostError } from './host.mjs';
import {
  calculateCodexEvaluationOperationalRetryDelay,
  runCodexEvaluationOperationalStage,
} from './operational-retry.mjs';

test('operational retry delay grows exponentially and remains capped with bounded jitter', () => {
  assert.equal(calculateCodexEvaluationOperationalRetryDelay(1, 0), 3_750);
  assert.equal(calculateCodexEvaluationOperationalRetryDelay(1, 1), 5_000);
  assert.equal(calculateCodexEvaluationOperationalRetryDelay(2, 0), 7_500);
  assert.equal(calculateCodexEvaluationOperationalRetryDelay(8, 1), 60_000);
  assert.throws(
    () => calculateCodexEvaluationOperationalRetryDelay(0),
    /failureCount must be a positive integer/,
  );
  assert.throws(
    () => calculateCodexEvaluationOperationalRetryDelay(1, 2),
    /randomValue must be between zero and one/,
  );
});

test('operational stage rejects invalid persisted retry accounting', async () => {
  await assert.rejects(
    runCodexEvaluationOperationalStage({
      initialFailureCount: -1,
      onRetry: async () => {},
      operation: async () => 'unreachable',
    }),
    /initialFailureCount must be a non-negative integer/,
  );
});

test('operational stage persists every retry before waiting and returns success', async () => {
  const sequence = [];
  const retries = [];
  let operationCount = 0;

  const result = await runCodexEvaluationOperationalStage({
    now: () => `2026-08-27T16:00:0${operationCount}.000Z`,
    onRetry: async (retry) => {
      sequence.push(`retry:${retry.failureCount}`);
      retries.push(retry);
    },
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
    wait: async (delayMs) => {
      sequence.push(`wait:${delayMs}`);
    },
  });

  assert.equal(result, 'completed');
  assert.equal(operationCount, 3);
  assert.deepEqual(sequence, ['retry:1', 'wait:5000', 'retry:2', 'wait:10000']);
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

  const result = await runCodexEvaluationOperationalStage({
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

test('operational stage retries every safe host failure category', async () => {
  const retryableKinds = [
    CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
    CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
    CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
  ];

  for (const kind of retryableKinds) {
    let operationCount = 0;
    let retryCount = 0;
    const result = await runCodexEvaluationOperationalStage({
      onRetry: async () => {
        retryCount += 1;
      },
      operation: async () => {
        operationCount += 1;
        if (operationCount === 1) {
          throw new CodexEvaluationHostError(kind, 'Retryable host failure.');
        }
        return kind;
      },
      wait: async () => {},
    });

    assert.equal(result, kind);
    assert.equal(retryCount, 1);
  }
});

test('operational stage does not retry terminal host or ordinary failures', async () => {
  const failures = [
    new CodexEvaluationHostError(
      CODEX_EVALUATION_HOST_FAILURE_KINDS.Aborted,
      'Host execution was aborted.',
    ),
    new CodexEvaluationHostError(
      CODEX_EVALUATION_HOST_FAILURE_KINDS.OutputLimit,
      'Host output exceeded its limit.',
    ),
    new CodexEvaluationHostError(
      CODEX_EVALUATION_HOST_FAILURE_KINDS.SpawnFailed,
      'Host process could not start.',
    ),
    new Error('Local deterministic failure.'),
  ];

  for (const failure of failures) {
    let retryCount = 0;

    await assert.rejects(
      runCodexEvaluationOperationalStage({
        onRetry: async () => {
          retryCount += 1;
        },
        operation: async () => {
          throw failure;
        },
        wait: async () => {},
      }),
      failure,
    );
    assert.equal(retryCount, 0);
  }
});

test('operational stage stops before execution when already cancelled', async () => {
  const controller = new AbortController();
  const cancellation = new Error('Cancelled before execution.');
  let operationCount = 0;
  let retryCount = 0;
  controller.abort(cancellation);

  await assert.rejects(
    runCodexEvaluationOperationalStage({
      onRetry: async () => {
        retryCount += 1;
      },
      operation: async () => {
        operationCount += 1;
      },
      signal: controller.signal,
    }),
    cancellation,
  );
  assert.equal(operationCount, 0);
  assert.equal(retryCount, 0);
});

test('operational stage stops an active backoff without another retry', async () => {
  const controller = new AbortController();
  const cancellation = new Error('Cancelled during backoff.');
  let operationCount = 0;
  let retryCount = 0;

  await assert.rejects(
    runCodexEvaluationOperationalStage({
      onRetry: async () => {
        retryCount += 1;
        setTimeout(() => controller.abort(cancellation), 0);
      },
      operation: async () => {
        operationCount += 1;
        throw new CodexEvaluationHostError(
          CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
          'Proxy is unavailable.',
        );
      },
      signal: controller.signal,
    }),
    cancellation,
  );
  assert.equal(operationCount, 1);
  assert.equal(retryCount, 1);
});
