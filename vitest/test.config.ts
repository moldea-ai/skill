import { defineConfig } from 'vitest/config';

type ITestKind = 'integration' | 'unit';

/** Creates one isolated root test-category configuration. */
export const createTestConfig = (testKind: ITestKind) =>
  defineConfig({
    test: {
      environment: 'node',
      include: [`src/**/*.test-${testKind}.ts`],
      testTimeout: testKind === 'integration' ? 180_000 : 20_000,
    },
  });
