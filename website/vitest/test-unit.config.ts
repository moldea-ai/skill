import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test-unit.ts'],
    testTimeout: 20_000,
  },
});
