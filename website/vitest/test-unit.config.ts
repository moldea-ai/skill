import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, '**/{_archive,_archives,_backup,_backups}/**'],
    include: ['scripts/**/*.test-unit.ts', 'src/**/*.test-unit.ts'],
    testTimeout: 20_000,
  },
});
