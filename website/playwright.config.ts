import { defineConfig, devices } from '@playwright/test';
import { DEFAULT_BASE_PATH, normalizeBasePath } from '@moldea.ai/website-ui/site';
import { z } from 'zod';

const basePath = normalizeBasePath(process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);
const previewPort = z.coerce
  .number()
  .int()
  .min(1)
  .max(65_535)
  .parse(process.env['PREVIEW_PORT'] ?? 4322);
const previewOrigin = `http://127.0.0.1:${previewPort}`;
const isCi = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.test-e2e.ts',
  grepInvert: /@qualification-current-fixture/u,
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  reporter: isCi ? 'github' : 'list',
  use: {
    baseURL: previewOrigin,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run build && ./node_modules/.bin/vite preview --base ${basePath} --host 127.0.0.1 --port ${previewPort} --strictPort`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: new URL(basePath, previewOrigin).href,
  },
});
