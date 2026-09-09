// @vitest-environment node
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runOrderedEvaluationBatch } from './coordinator.mjs';

test('commits concurrent work in deterministic input order', async () => {
  const committed = [];
  let activeCount = 0;
  let maximumActiveCount = 0;
  const values = await runOrderedEvaluationBatch({
    commitItem: async ({ value }) => {
      committed.push(value);
    },
    executeItem: async ({ item }) => {
      activeCount += 1;
      maximumActiveCount = Math.max(maximumActiveCount, activeCount);
      await new Promise((resolve) => setTimeout(resolve, item.delay));
      activeCount -= 1;
      return item.id;
    },
    items: [
      { delay: 20, id: 'one' },
      { delay: 1, id: 'two' },
      { delay: 1, id: 'three' },
      { delay: 1, id: 'four' },
    ],
    workerCount: 4,
  });

  assert.equal(maximumActiveCount, 4);
  assert.deepEqual(committed, ['one', 'two', 'three', 'four']);
  assert.deepEqual(values, committed);
});

test('produces the same committed values with one or four workers', async () => {
  const executeBatch = async (workerCount) => {
    const committed = [];
    const values = await runOrderedEvaluationBatch({
      commitItem: async ({ value }) => {
        committed.push(value);
      },
      executeItem: async ({ item }) => item * 2,
      items: [1, 2, 3, 4, 5, 6],
      workerCount,
    });
    return { committed, values };
  };

  assert.deepEqual(await executeBatch(1), await executeBatch(4));
});

test('stops dispatch after one failure and drains active siblings', async () => {
  const started = [];
  const completed = [];
  const stopped = [];

  await assert.rejects(
    runOrderedEvaluationBatch({
      commitItem: async ({ value }) => {
        completed.push(value);
      },
      executeItem: async ({ item }) => {
        started.push(item);
        if (item === 1) throw new Error('stopped');
        await new Promise((resolve) => setTimeout(resolve, 5));
        return item;
      },
      items: [0, 1, 2, 3, 4, 5],
      onItemError: async ({ index }) => {
        stopped.push(index);
      },
      workerCount: 4,
    }),
    /stopped/u,
  );

  assert.deepEqual(started, [0, 1, 2, 3]);
  assert.deepEqual(completed, []);
  assert.deepEqual(stopped, [1]);
});

test('drains active siblings when persisting the stop checkpoint also fails', async () => {
  const started = [];
  const completed = [];

  await assert.rejects(
    runOrderedEvaluationBatch({
      commitItem: async () => {},
      executeItem: async ({ item }) => {
        started.push(item);
        if (item === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1));
          throw new Error('execution stopped');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
        completed.push(item);
        return item;
      },
      items: [0, 1, 2, 3, 4],
      onItemError: async () => {
        throw new Error('checkpoint stopped');
      },
      workerCount: 4,
    }),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.match(error.message, /batch failed and its stop checkpoint could not be persisted/u);
      assert.deepEqual(
        error.errors.map(({ message }) => message),
        ['execution stopped', 'checkpoint stopped'],
      );
      return true;
    },
  );

  assert.deepEqual(started, [0, 1, 2, 3]);
  assert.deepEqual(completed, [1, 2, 3]);
});

test('rejects unsupported worker counts', async () => {
  await assert.rejects(
    runOrderedEvaluationBatch({
      commitItem: async () => {},
      executeItem: async () => null,
      items: [1],
      workerCount: 3,
    }),
    /must be 1, 2, or 4/u,
  );
});

test('stops new dispatch and reports one deterministic commit failure', async () => {
  const started = [];
  const stopped = [];

  await assert.rejects(
    runOrderedEvaluationBatch({
      commitItem: async ({ index }) => {
        if (index === 1) throw new Error('commit stopped');
      },
      executeItem: async ({ item }) => {
        started.push(item);
        await new Promise((resolve) => setTimeout(resolve, item === 0 ? 1 : 10));
        return item;
      },
      items: [0, 1, 2, 3, 4, 5],
      onItemError: async ({ index }) => {
        stopped.push(index);
      },
      workerCount: 4,
    }),
    /commit stopped/u,
  );

  assert.deepEqual(started, [0, 1, 2, 3, 4]);
  assert.equal(started.includes(5), false);
  assert.deepEqual(stopped, [1]);
});

test('resumes completed private work at another accepted worker count', async () => {
  const checkpoints = new Map();
  const executionCounts = new Map();
  let shouldFail = true;
  const executeItem = async ({ item }) => {
    if (checkpoints.has(item)) return checkpoints.get(item);
    executionCounts.set(item, (executionCounts.get(item) ?? 0) + 1);
    if (item === 1 && shouldFail) {
      shouldFail = false;
      throw new Error('interrupted');
    }
    await new Promise((resolve) => setTimeout(resolve, item === 0 ? 5 : 1));
    const checkpoint = `completed-${item}`;
    checkpoints.set(item, checkpoint);
    return checkpoint;
  };

  await assert.rejects(
    runOrderedEvaluationBatch({
      commitItem: async () => {},
      executeItem,
      items: [0, 1, 2, 3],
      workerCount: 4,
    }),
    /interrupted/u,
  );

  const committed = [];
  await runOrderedEvaluationBatch({
    commitItem: async ({ value }) => committed.push(value),
    executeItem,
    items: [0, 1, 2, 3],
    workerCount: 1,
  });

  assert.deepEqual(committed, ['completed-0', 'completed-1', 'completed-2', 'completed-3']);
  assert.deepEqual(Object.fromEntries(executionCounts), { 0: 1, 1: 2, 2: 1, 3: 1 });
});
