import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';

const route = withBase('/evidence/journeys/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);

test('links every journey with accessible outcomes, provenance and raw sources', async ({
  page,
}) => {
  await page.goto(route);
  const model = loadWebsiteModel().scriptedJourneys!;
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Follow the skill across a conversation.',
  );
  await expect(page.locator('[data-journeys-matrix] li')).toHaveCount(model.journeys.length);
  await expect(
    page.getByRole('group', { name: 'Preserve project knowledge, Claude: failed', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Repair a damaged foundation, ChatGPT: blocked', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Raw assessment JSON' })).toHaveAttribute(
    'href',
    /assessment\.json$/u,
  );
  await expect(page.getByText('chatgpt fixture model', { exact: true })).toBeVisible();
  await expect(page.getByText('claude fixture model', { exact: true })).toBeVisible();
  await page.getByText('Assessor identity and source hashes', { exact: true }).click();
  await expect(page.getByText(model.assessor.sourceSha256, { exact: true })).toBeVisible();
  const search = await (
    await page.request.get(
      withBase('/search-index.json', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH),
    )
  ).text();
  expect(search).toContain('/evidence/journeys/initialize/');
  const llms = await (
    await page.request.get(withBase('/llms.txt', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH))
  ).text();
  expect(llms).toContain('/evidence/journeys/initialize/');
});

test('keeps the matrix accessible at 320px and desktop in both themes', async ({
  browser,
}, testInfo) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(route);
        expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`journeys-${colorScheme}-${width}.png`),
          fullPage: true,
        });
      }
    } finally {
      await context.close();
    }
  }
});
