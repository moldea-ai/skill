import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';
import { getQualificationReleaseEvidenceSummary } from '../../lib/release-evidence/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);
const qualification = loadWebsiteModel().qualification;
const customProfile = qualification.profiles.find(
  ({ adapterId, implementationId }) => adapterId === 'custom' && implementationId === 'custom',
);

if (customProfile === undefined) {
  throw new Error('Synthetic browser evidence requires the Custom qualification profile.');
}

test('shows the selected qualification snapshot without a visitor selector', async ({ page }) => {
  await page.goto(toPublicPath(qualification.route));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the integration in your project.' }),
  ).toBeVisible();
  const profileLink = page.getByRole('link', { name: customProfile.title });
  await expect(profileLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    getQualificationReleaseEvidenceSummary(customProfile).status,
  );
  await expect(page.getByRole('combobox')).toHaveCount(0);
});

test('keeps replay, project, evidence, and technical views available', async ({ page }) => {
  await page.goto(toPublicPath(customProfile.route));

  await expect(page.getByRole('heading', { level: 1, name: customProfile.title })).toBeVisible();
  const journey = page.locator('details[data-accordion-item]').filter({ hasText: 'Release case' });
  await journey.locator(':scope > summary').click();
  const replayTab = journey.getByRole('tab', { name: 'Replay' });
  const projectTab = journey.getByRole('tab', { name: 'Project' });
  const evidenceTab = journey.getByRole('tab', { name: 'Evidence' });
  const technicalTab = journey.getByRole('tab', { name: 'Technical' });

  await expect(replayTab).toHaveAttribute('aria-selected', 'true');
  await replayTab.press('ArrowRight');
  await expect(projectTab).toBeFocused();
  await expect(journey.getByRole('heading', { name: 'Starting project' })).toBeVisible();
  await projectTab.press('ArrowRight');
  await expect(evidenceTab).toBeFocused();
  await expect(journey.getByRole('heading', { name: 'What had to happen' })).toBeVisible();
  await evidenceTab.press('End');
  await expect(technicalTab).toBeFocused();
  await expect(journey.getByRole('heading', { name: 'Complete trial evidence' })).toBeVisible();
});

test('opens a selected journey through its stable fragment', async ({ page }) => {
  await page.goto(`${toPublicPath(customProfile.route)}#qualification-release-case`);

  await expect(page.locator('#qualification-release-case')).toHaveAttribute('open', '');
});

test('remains accessible, responsive, and theme-safe for selected evidence', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 900, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath(customProfile.route));
    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityResults.violations).toStrictEqual([]);
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await context.close();
  }
});
