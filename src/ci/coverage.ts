import { resolve } from 'node:path';
import { createVitest } from 'vitest/node';

import { EXECUTOR_TAGS, EXECUTOR_TEST_FILE } from './constants.ts';
import type { ICollectedTest, IQualificationPartition } from './types.ts';

// keep the coverage audit aligned with actual workflow CLI selections
const QUALIFICATION_PARTITIONS: IQualificationPartition[] = [
  { name: 'remaining', exclude: [EXECUTOR_TEST_FILE] },
  ...EXECUTOR_TAGS.map((tag) => ({ name: tag, filters: [EXECUTOR_TEST_FILE], tagsFilter: [tag] })),
];

/**
 * Collects real Vitest declarations without executing test bodies or lifecycle hooks.
 * @returns Active declaration identities selected by the given CLI filters.
 * @throws If configuration, imports, or test collection fails.
 */
export const collectIntegrationTests = async (
  root: string,
  partition: IQualificationPartition = { name: 'full' },
): Promise<ICollectedTest[]> => {
  const vitest = await createVitest('test', {
    root,
    config: resolve(root, 'vitest/test-integration.config.ts'),
    watch: false,
    reporters: [],
    ...(partition.exclude === undefined ? {} : { exclude: partition.exclude }),
    ...(partition.tagsFilter === undefined ? {} : { tagsFilter: partition.tagsFilter }),
  });
  try {
    const specifications = await vitest.globTestSpecifications(partition.filters);
    if (specifications.length === 0)
      throw new Error(`No integration files collected for ${partition.name}.`);
    const result = await vitest.collectTests(specifications);
    if (result.unhandledErrors.length > 0 || result.testModules.some((module) => !module.ok())) {
      throw new Error(`Integration collection failed for ${partition.name}.`, {
        cause: result.unhandledErrors,
      });
    }
    return result.testModules.flatMap((module) =>
      [...module.children.allTests()]
        .filter((test) => test.options.mode === 'run' || test.options.mode === 'only')
        .map((test) => ({ id: test.id, file: module.relativeModuleId, tags: test.tags })),
    );
  } finally {
    await vitest.close();
  }
};

/**
 * Requires valid executor tags and exactly-once membership in the actual partition union.
 * @throws If an inventory is empty, tags are invalid, or coverage is missing or duplicated.
 */
export const assertPartitionCoverage = (
  full: ICollectedTest[],
  partitions: ICollectedTest[][],
): void => {
  if (full.length === 0) throw new Error('Full integration inventory is empty.');
  const expected = new Set(full.map((test) => test.id));
  if (expected.size !== full.length)
    throw new Error('Full integration inventory has duplicate identities.');
  for (const test of full) {
    const partitionTags = test.tags.filter((tag) => tag.startsWith('ci-executor-'));
    if (
      test.file === EXECUTOR_TEST_FILE &&
      (partitionTags.length !== 1 || !EXECUTOR_TAGS.some((tag) => tag === partitionTags[0]))
    )
      throw new Error(`Executor test ${test.id} must have exactly one known partition tag.`);
  }
  const counts = new Map<string, number>();
  for (const test of partitions.flat()) counts.set(test.id, (counts.get(test.id) ?? 0) + 1);
  if (
    counts.size !== expected.size ||
    [...counts].some(([id, count]) => !expected.has(id) || count !== 1) ||
    [...expected].some((id) => !counts.has(id))
  ) {
    throw new Error('Qualification partitions must cover every integration test exactly once.');
  }
};

/**
 * Audits the complete qualification suite against all real CI collection selections.
 * @throws If collection or partition coverage fails.
 * @returns A promise resolving when every maintained scenario is covered exactly once.
 */
export const checkQualificationCoverage = async (root: string): Promise<void> => {
  const full = await collectIntegrationTests(root);
  const partitions: ICollectedTest[][] = [];
  for (const partition of QUALIFICATION_PARTITIONS) {
    partitions.push(await collectIntegrationTests(root, partition));
  }
  assertPartitionCoverage(full, partitions);
};

if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
  await checkQualificationCoverage(resolve(import.meta.dirname, '../../qualification'));
}
