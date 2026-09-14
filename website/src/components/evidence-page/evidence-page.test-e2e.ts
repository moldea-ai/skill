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
      name: 'Follow each result from request to verdict.',
    }),
  ).toBeVisible();
  const evidenceFlow = page.getByRole('list', {
    name: 'Evidence included with every result',
  });
  await expect(evidenceFlow.getByRole('heading')).toHaveText([
    'Request',
    'Agent work',
    'Project diff',
    'Verdict',
  ]);
  const integrationEvidence = page.locator('article').filter({
    has: page.getByRole('heading', {
      name: 'Does it work through your integration?',
    }),
  });
  const decisionEvidence = page.locator('[data-evidence-path="decision"]');
  const anthropicProfile = loadWebsiteModel().qualification.profiles.find(
    ({ adapterId }) => adapterId === 'anthropic',
  );
  if (anthropicProfile === undefined) throw new Error('Missing Anthropic qualification profile.');
  await expect(decisionEvidence.getByRole('listitem')).toHaveCount(3);
  await expect(integrationEvidence.getByRole('listitem')).toHaveCount(3);
  await expect(integrationEvidence.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    getQualificationReleaseEvidenceSummary(anthropicProfile).status,
  );
  const qualificationAction = integrationEvidence.locator('[data-evidence-path-action]');
  await expect(
    qualificationAction.getByRole('group', { name: 'Integration providers' }),
  ).toBeVisible();
  const providerLogos = qualificationAction.getByRole('img', { name: /company logo/ });
  await expect(providerLogos).toHaveCount(3);
  await expect(providerLogos.nth(0)).toHaveAttribute('alt', 'OpenAI company logo');
  await expect(providerLogos.nth(1)).toHaveAttribute('alt', 'Anthropic company logo');
  await expect(providerLogos.nth(2)).toHaveAttribute('alt', 'Vercel company logo');
  await expect(qualificationAction.getByLabel('3 more integration providers')).toHaveText('+3');
  await expect(page.getByRole('link', { name: /Open the decision journeys/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Choose your integration/ })).toBeVisible();

  const [decisionBox, qualificationBox] = await Promise.all([
    decisionEvidence.boundingBox(),
    integrationEvidence.boundingBox(),
  ]);
  expect(decisionBox).not.toBeNull();
  expect(qualificationBox).not.toBeNull();
  expect(
    Math.abs((decisionBox?.height ?? 0) - (qualificationBox?.height ?? 0)),
  ).toBeLessThanOrEqual(1);
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
    const [decisionBox, qualificationBox] = await Promise.all([
      page.locator('[data-evidence-path="decision"]').boundingBox(),
      page.locator('[data-evidence-path="qualification"]').boundingBox(),
    ]);
    expect(decisionBox).not.toBeNull();
    expect(qualificationBox).not.toBeNull();

    const qualificationAction = page
      .locator('[data-evidence-path="qualification"]')
      .locator('[data-evidence-path-action]');
    const [actionLayoutBox, actionLinkBox, integrationLogosBox] = await Promise.all([
      qualificationAction.locator('[data-evidence-integration-actions]').boundingBox(),
      qualificationAction.getByRole('link', { name: 'View adapters' }).boundingBox(),
      qualificationAction.getByRole('group', { name: 'Integration providers' }).boundingBox(),
    ]);
    expect(actionLayoutBox).not.toBeNull();
    expect(actionLinkBox).not.toBeNull();
    expect(integrationLogosBox).not.toBeNull();
    expect(Math.abs((actionLayoutBox?.width ?? 0) - (actionLinkBox?.width ?? 0))).toBeLessThan(2);
    expect(integrationLogosBox?.y ?? 0).toBeGreaterThan(
      (actionLinkBox?.y ?? 0) + (actionLinkBox?.height ?? 0),
    );
    await expect(
      qualificationAction.getByRole('group', { name: 'Integration providers' }).getByRole('img'),
    ).toHaveCount(6);
    await expect(qualificationAction.getByLabel('3 more integration providers')).toBeHidden();
    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);

    await context.close();
  }
});
