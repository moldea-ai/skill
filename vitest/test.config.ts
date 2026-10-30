import { configDefaults, defineConfig } from 'vitest/config';

import { createVitestSuiteOptions, FULL_ONLY_TEST_FILES } from '../src/test-suite/index.ts';

type ITestKind = 'integration' | 'unit';

/**
 * Creates one isolated root category, preserving complete unset granular selection.
 * @returns The category configuration with full-only imports excluded in essential.
 * @throws
 * - MOLDEA_TEST_SUITE must be essential or full when set.
 */
export const createTestConfig = (
  testKind: ITestKind,
  options: { include?: string[]; fullOnlyFiles?: readonly string[] } = {},
) => {
  const selection = createVitestSuiteOptions({
    fullOnlyFiles: [...FULL_ONLY_TEST_FILES, ...(options.fullOnlyFiles ?? [])],
  });
  return defineConfig({
    test: {
      environment: 'node',
      exclude: [
        ...configDefaults.exclude,
        ...selection.exclude,
        '**/_archive/**',
        '**/_archives/**',
        '**/_backup/**',
        '**/_backups/**',
      ],
      include: options.include ?? [`src/**/*.test-${testKind}.ts`],
      tags: selection.tags,
      passWithNoTests: false,
      testTimeout: testKind === 'integration' ? 180_000 : 20_000,
    },
  });
};
