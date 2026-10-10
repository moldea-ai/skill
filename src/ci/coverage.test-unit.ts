// @vitest-environment node
import { expect, test } from 'vitest';

import { assertPartitionCoverage, type ICollectedTest } from './index.ts';

const executor: ICollectedTest = {
  id: 'executor',
  file: 'src/execution/executor.test-integration.ts',
  tags: ['ci-executor-1'],
};
const other: ICollectedTest = { id: 'other', file: 'src/other.test-integration.ts', tags: [] };

test('accepts exactly-once coverage of executor and remaining tests', () => {
  expect(() => assertPartitionCoverage([executor, other], [[other], [executor]])).not.toThrow();
});

test.each([
  ['omission', [[executor]]],
  ['duplication', [[executor, other], [executor]]],
  ['unknown identity', [[executor, other, { ...other, id: 'unexpected' }]]],
])('rejects partition %s', (_name, partitions) => {
  expect(() => assertPartitionCoverage([executor, other], partitions)).toThrow('exactly once');
});

test.each([[], ['ci-executor-5'], ['ci-executor-1', 'ci-executor-2']])(
  'rejects executor tags %o',
  (...tags) => {
    const invalid = { ...executor, tags };
    expect(() => assertPartitionCoverage([invalid], [[invalid]])).toThrow('exactly one known');
  },
);

test('rejects empty or duplicate full inventories', () => {
  expect(() => assertPartitionCoverage([], [])).toThrow('empty');
  expect(() => assertPartitionCoverage([other, other], [[other]])).toThrow('duplicate');
});
