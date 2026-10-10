import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, '**/{_archive,_archives,_backup,_backups}/**'],
    include: ['scripts/**/*.test-integration.ts', 'src/**/*.test-integration.ts'],
    testTimeout: 20_000,
  },
});
