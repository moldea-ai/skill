import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';
import { PACKAGES_WEBSITE_URL } from '../../lib/model/constants.ts';
import { getQualificationReleaseEvidenceSummary } from '../../lib/release-evidence/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows the deterministic flow and the complete supported adapter set', async ({ page }) => {
  const model = loadWebsiteModel();
  const adapterProfiles = model.qualification.profiles.filter(
    ({ adapterId }) => adapterId !== 'custom',
  );
  const adapterCount = new Set(adapterProfiles.map(({ adapterId }) => adapterId)).size;
  const qualifiedAdapterSetupCount = adapterProfiles
    .map(getQualificationReleaseEvidenceSummary)
    .filter(({ status }) => status === 'passed').length;
  await page.goto(toPublicPath('/'));

  const deterministicChecks = page.getByRole('region', {
    name: 'Same project. Same check. Same result.',
  });
  await expect(deterministicChecks).toBeVisible();
  for (const heading of ['Repository files', 'Local software', 'Repeatable evidence']) {
    await expect(
      deterministicChecks.getByRole('heading', { level: 3, name: heading }),
    ).toBeVisible();
  }
  await expect(
    deterministicChecks.getByRole('heading', { level: 3, name: 'Disconnected' }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByRole('heading', { level: 3, name: 'Connected', exact: true }),
  ).toBeVisible();
  await expect(
    deterministicChecks.locator('[data-connection-state-icon="disconnected"]'),
  ).toBeVisible();
  await expect(
    deterministicChecks.locator('[data-connection-state-icon="connected"]'),
  ).toBeVisible();
  await expect(deterministicChecks.locator('[data-connection-path="disconnected"]')).toBeVisible();
  await expect(deterministicChecks.locator('[data-connection-path="connected"]')).toBeVisible();
  await expect(deterministicChecks.getByText('Missing link', { exact: true })).toBeVisible();
  await expect(deterministicChecks.getByText('Verified', { exact: true })).toBeVisible();
  await expect(
    deterministicChecks.getByText("instructions: 'Be helpful.'", { exact: false }),
  ).toBeVisible();
  await expect(
    deterministicChecks.getByText('instructions: loadSupportInstruction()', { exact: false }),
  ).toBeVisible();
  await expect(deterministicChecks.getByRole('button', { name: /Copy/u })).toHaveCount(0);

  await expect(
    deterministicChecks.getByText(
      `${adapterCount} adapters · ${qualifiedAdapterSetupCount} qualified setups`,
      { exact: true },
    ),
  ).toBeVisible();
  const adapters = deterministicChecks.getByRole('list', { name: 'Supported runtime adapters' });
  await expect(adapters.getByRole('listitem')).toHaveCount(adapterCount);
  for (const [index, adapter] of ['OpenAI', 'Anthropic', 'Vercel AI SDK'].entries()) {
    await expect(adapters.getByRole('listitem').nth(index)).toContainText(adapter);
  }

  const packagesLink = deterministicChecks.getByRole('link', {
    name: 'Explore adapter packages',
  });
  await expect(packagesLink).toHaveAttribute('href', PACKAGES_WEBSITE_URL);
  await expect(packagesLink).toHaveAttribute('target', '_blank');
  await expect(packagesLink).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(packagesLink.locator('[data-external-link-icon]')).toBeVisible();
  await expect(
    deterministicChecks.getByRole('link', { name: 'See adapter qualifications' }),
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

    const flowItems = deterministicChecks.locator('[data-deterministic-flow] > ol > li');
    const firstItemBounds = await flowItems.nth(0).boundingBox();
    const thirdItemBounds = await flowItems.nth(2).boundingBox();
    expect(firstItemBounds).not.toBeNull();
    expect(thirdItemBounds).not.toBeNull();
    if (firstItemBounds && thirdItemBounds) {
      expect(thirdItemBounds.y).toBeGreaterThanOrEqual(firstItemBounds.y + firstItemBounds.height);
    }

    await context.close();
  }
});
