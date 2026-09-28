import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const route = (value: string): string =>
  withBase(value, process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);

test('opens the third evidence section directly and follows bounded project pages', async ({
  page,
}) => {
  await page.goto(route('/evidence/'));
  await page.getByRole('link', { name: 'Explore project runs' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Small projects.Real coding sessions.',
  );
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.locator('[data-project-story]')).toHaveCount(16);
  await expect(page.locator('[data-project-preview]')).toContainText('Illustrative test records');
  await expect(page.getByRole('link', { name: 'Previous', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Next', exact: true }).click();
  await expect(page.locator('[data-project-story]')).toHaveCount(1);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Next', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Explore Field Notes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Field Notes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The request' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible();
});

test('keeps project pages readable across sizes and themes without client-side list loading', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [320, 768, 1440]) {
      const context = await browser.newContext({
        colorScheme,
        reducedMotion: 'reduce',
        viewport: { width, height: 900 },
      });
      try {
        const page = await context.newPage();
        for (const target of [
          '/evidence/project-runs/',
          '/evidence/project-runs/projects/project-1/',
        ]) {
          await page.goto(route(target));
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
            ),
          ).toBe(true);
          expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
        }
      } finally {
        await context.close();
      }
    }
  }
});
