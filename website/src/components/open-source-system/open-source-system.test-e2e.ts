import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { PACKAGES_WEBSITE_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('explains deterministic checks and the adapter boundary', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const deterministicChecks = page.getByRole('region', {
    name: 'Software checks the connections.',
  });
  await expect(deterministicChecks).toBeVisible();
  await expect(
    deterministicChecks.getByText('Same files, tool versions, and settings. Same result.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByRole('heading', {
      level: 3,
      name: 'Saved, but disconnected',
    }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByText("instructions: 'Be helpful.'", { exact: false }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByText('instructions: loadSupportInstruction()', { exact: false }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByRole('heading', {
      level: 3,
      name: 'Connected to the agent',
    }),
  ).toBeVisible();
  await expect(deterministicChecks.getByRole('button', { name: /Copy/u })).toHaveCount(0);

  const logos = deterministicChecks.getByRole('list', { name: 'Example supported integrations' });
  await expect(logos.locator('img')).toHaveCount(3);
  await expect(logos.locator('img').nth(0)).toHaveAttribute('alt', 'OpenAI company logo');
  await expect(logos.locator('img').nth(1)).toHaveAttribute('alt', 'Anthropic company logo');
  await expect(logos.locator('img').nth(2)).toHaveAttribute('alt', 'Vercel company logo');

  const packagesLink = deterministicChecks.getByRole('link', { name: 'Explore packages' });
  await expect(packagesLink).toHaveAttribute('href', PACKAGES_WEBSITE_URL);
  await expect(packagesLink).toHaveAttribute('target', '_blank');
  await expect(packagesLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(
    deterministicChecks.getByRole('link', { name: 'See every integration' }),
  ).toHaveAttribute('href', toPublicPath('/evidence/qualification/'));
});

test('keeps the deterministic example readable at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const deterministicChecks = page.locator('[data-open-source-system]');
    const widths = await deterministicChecks.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    await context.close();
  }
});
