import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';
import { PACKAGES_WEBSITE_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('explains deterministic checks and the adapter boundary', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const deterministicChecks = page.getByRole('region', {
    name: 'Software checks the connections.',
  });
  await expect(deterministicChecks).toBeVisible();
  for (const fact of ['Same files', 'Same tool versions', 'Same settings', 'Same result']) {
    await expect(deterministicChecks.getByText(fact, { exact: true })).toBeVisible();
  }
  await expect(
    deterministicChecks.getByRole('heading', {
      level: 3,
      name: "The instructions exist. The agent's code does not use them.",
    }),
  ).toBeVisible();
  await expect(deterministicChecks.getByText(LANDING_EXAMPLE.diagnostic)).toBeVisible();
  await expect(
    deterministicChecks.getByText("instructions: 'Be helpful.'", { exact: false }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByText('instructions: loadSupportInstruction()', { exact: false }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByRole('heading', {
      level: 3,
      name: 'The agent code uses the saved instructions.',
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
  await expect(
    deterministicChecks.getByRole('link', { name: 'Inspect a recorded repair' }),
  ).toHaveAttribute(
    'href',
    toPublicPath(
      '/evidence/qualification/openai/typescript-responses-api-7/#qualification-repair-openai-tool-registration',
    ),
  );
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
