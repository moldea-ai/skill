import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { PACKAGES_WEBSITE_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('presents the open-source infrastructure a team would otherwise build', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const openSourceSystem = page.getByRole('region', {
    name: 'The alternative is building this infrastructure yourself.',
  });
  await expect(openSourceSystem).toBeVisible();

  for (const layer of [
    'Repository Format',
    'Agent Skill',
    'Deterministic contracts',
    'Coherent source evidence',
    'Runtime-specific evidence',
    'Evaluation and qualification',
  ]) {
    await expect(openSourceSystem.getByRole('heading', { level: 3, name: layer })).toBeVisible();
  }

  await expect(openSourceSystem.locator('ol > li')).toHaveCount(6);
  const packagesLink = openSourceSystem.getByRole('link', { name: 'Explore packages' });
  await expect(packagesLink).toHaveAttribute('href', PACKAGES_WEBSITE_URL);
  await expect(packagesLink).toHaveAttribute('target', '_blank');
  await expect(packagesLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(
    openSourceSystem.getByRole('link', { name: 'Review release evidence' }),
  ).toHaveAttribute('href', toPublicPath('/evidence/'));
});

test('keeps the open-source system readable at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const openSourceSystem = page.locator('[data-open-source-system]');
    const widths = await openSourceSystem.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    await context.close();
  }
});
