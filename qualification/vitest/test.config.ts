import { defineConfig, type ViteUserConfig } from 'vitest/config';

// cross-platform allowance for filesystem and process integration work
const INTEGRATION_TEST_TIMEOUT_MS = 20_000;

// supported qualification correctness-test categories
export type ITestSuiteKind = 'integration' | 'unit';

/**
 * Creates one deterministic Node.js Vitest configuration.
 * @param suite The qualification test category to discover.
 * @returns A Vitest configuration isolated to the selected category.
 */
export const createTestConfig = (suite: ITestSuiteKind): ViteUserConfig =>
  defineConfig({
    test: {
      clearMocks: true,
      environment: 'node',
      globals: false,
      include: [`src/**/*.test-${suite}.ts`],
      passWithNoTests: false,
      restoreMocks: true,
      ...(suite === 'integration' ? { testTimeout: INTEGRATION_TEST_TIMEOUT_MS } : {}),
      sequence: {
        shuffle: false,
      },
      unstubEnvs: true,
      unstubGlobals: true,
    },
  });
