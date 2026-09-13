import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';
import { getQualificationReleaseEvidenceSummary } from '../../lib/release-evidence/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('explains both evidence types with release-backed status', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/'));

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'The agent writes code. moldea gives the project a memory.',
    }),
  ).toBeVisible();
  await expect(page.getByText('Coding agent alone', { exact: true })).toBeVisible();
  await expect(page.getByText('Coding agent with moldea', { exact: true })).toBeVisible();
  await expect(
    page.getByText('The next session has to infer those relationships again.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('The next session starts with the same project-owned context.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('[data-code-block][data-code-copy="false"]')).toHaveCount(2);
  const integrationEvidence = page.locator('article').filter({
    has: page.getByRole('heading', {
      name: 'Does it work through your integration?',
    }),
  });
  const anthropicProfile = loadWebsiteModel().qualification.profiles.find(
    ({ adapterId }) => adapterId === 'anthropic',
  );
  if (anthropicProfile === undefined) throw new Error('Missing Anthropic qualification profile.');
  await expect(integrationEvidence.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    getQualificationReleaseEvidenceSummary(anthropicProfile).status,
  );
  await expect(page.getByRole('link', { name: /Open the decision journeys/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Choose your integration/ })).toBeVisible();
});

test('keeps the evidence overview accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/evidence/'));

    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);

    await context.close();
  }
});
