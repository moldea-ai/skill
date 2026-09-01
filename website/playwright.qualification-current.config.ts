import { defineConfig, devices } from '@playwright/test';
import { DEFAULT_BASE_PATH, normalizeBasePath } from '@moldea.ai/website-ui/site';
import { z } from 'zod';

const basePath = normalizeBasePath(process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);
const previewPort = z.coerce
  .number()
  .int()
  .min(1)
  .max(65_535)
  .parse(process.env['QUALIFICATION_PREVIEW_PORT'] ?? 4323);
const previewOrigin = `http://127.0.0.1:${previewPort}`;
const isCi = Boolean(process.env['CI']);
const outputDirectory = '.qualification-current-dist';

export default defineConfig({
  testDir: './src',
  testMatch: '**/pages/evidence/qualification/_index.test-e2e.ts',
  grep: /@qualification-current-fixture/u,
  globalTeardown: './scripts/cleanup-qualification-current-e2e-fixture.ts',
  fullyParallel: false,
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
    command: `node scripts/generate-qualification-current-e2e-fixture.ts && ./node_modules/.bin/astro build --outDir ${outputDirectory} && ./node_modules/.bin/vite preview --base ${basePath} --host 127.0.0.1 --port ${previewPort} --strictPort --outDir ${outputDirectory}`,
    reuseExistingServer: false,
    timeout: 120_000,
    url: new URL(basePath, previewOrigin).href,
  },
});
