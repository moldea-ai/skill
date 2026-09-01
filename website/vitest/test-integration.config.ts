import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/**/*.test-integration.ts', 'src/**/*.test-integration.ts'],
    testTimeout: 20_000,
  },
});
