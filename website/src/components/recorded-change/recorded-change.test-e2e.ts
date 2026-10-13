import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';

import { getRepositoryRoot, loadWebsiteModel } from '../../lib/generation/generation.ts';
import { getSemanticPreviewCase } from '../evidence-page/index.ts';

const executeFile = promisify(execFile);

test('keeps recorded semantic and project files visible without an assistant reply', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const websiteRoot = path.join(getRepositoryRoot(), 'website');
  const fixtureRoot = await mkdtemp(path.join(websiteRoot, '.generated', 'no-reply-'));
  try {
    const model = loadWebsiteModel();
    const recordedCase = getSemanticPreviewCase(
      model.semanticEvaluation,
      'bound-context-maintenance',
    );
    const recordedProject = model.projectRuns?.pages[0]?.attempts[0];
    if (!recordedCase?.replay || !recordedProject?.session)
      throw new Error('No-reply coverage requires the recorded website fixture.');
    const evaluationCase = {
      ...recordedCase,
      replay: {
        ...recordedCase.replay,
        trials: recordedCase.replay.trials.map((trial) => ({
          ...trial,
          steps: trial.steps.filter(
            (step) => step.kind !== 'message' || step.role !== 'coding-agent',
          ),
        })),
      },
    };
    const attempt = {
      ...recordedProject,
      session: recordedProject.session.filter(
        (entry) => entry.kind !== 'message' || entry.role !== 'assistant',
      ),
    };
    const pages = path.join(fixtureRoot, 'src', 'pages');
    const relativeImport = (target: string): string =>
      path.relative(pages, path.join(websiteRoot, target)).split(path.sep).join('/');
    await mkdir(pages, { recursive: true });
    await writeFile(
      path.join(fixtureRoot, 'fixture.json'),
      JSON.stringify({ evaluationCase, attempt }),
    );
    await writeFile(
      path.join(pages, 'index.astro'),
      `---
import RecordedChange from ${JSON.stringify(relativeImport('src/components/recorded-change/recorded-change.astro'))};
import RecordedProject from ${JSON.stringify(relativeImport('src/components/recorded-project/recorded-project.astro'))};
import ${JSON.stringify(relativeImport('src/styles/global.css'))};
import fixture from '../../fixture.json';
---
<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width" /><title>No-reply evidence fixture</title></head><body><main class="min-w-0 p-4"><RecordedChange evaluationCase={fixture.evaluationCase} /><RecordedProject attempt={fixture.attempt} /></main></body></html>`,
    );
    await writeFile(
      path.join(fixtureRoot, 'build.mjs'),
      `import { build } from 'astro';
import tailwindcss from '@tailwindcss/vite';
await build({ root: process.argv[2], configFile: false, cacheDir: './cache', logLevel: 'silent', build: { inlineStylesheets: 'always' }, vite: { plugins: [tailwindcss()] } });`,
    );
    await executeFile(process.execPath, [path.join(fixtureRoot, 'build.mjs'), fixtureRoot], {
      cwd: websiteRoot,
      timeout: 120_000,
    });
    const html = await readFile(path.join(fixtureRoot, 'dist', 'index.html'), 'utf8');
    for (const colorScheme of ['light', 'dark'] as const) {
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        await page.setContent(html);
        await page
          .locator('html')
          .evaluate((element, theme) => element.classList.add(theme), colorScheme);
        await expect(page.locator('[data-conversation-message="assistant"]')).toHaveCount(0);
        for (const [label, paths] of [
          [
            'Recorded test files',
            [
              'moldea/context/cleanup-policy.md',
              'moldea/moldea.yaml',
              'src/cleanup-scheduler.js',
              'src/cleanup-scheduler.test-unit.js',
            ],
          ],
          [
            'Recorded project patch paths',
            ['moldea/project.md', 'src/reminders.js', 'src/reminders.test-unit.js'],
          ],
        ] as const) {
          const files = page.getByRole('list', { name: label, exact: true });
          await expect(files).toBeVisible();
          expect(
            await files
              .locator('[data-recorded-file-path]')
              .evaluateAll((elements) =>
                elements.map((element) => element.getAttribute('data-recorded-file-path')),
              ),
          ).toStrictEqual(paths);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
      }
    }
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});
