import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { LANDING_EXAMPLE, LANDING_EXAMPLE_PREVIEW } from '../../lib/landing-example/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const route = withBase('/how-it-works/', basePath);
const toPublicPath = (publicRoute: string): string => withBase(publicRoute, basePath);

/** Returns the server-rendered accessible names for keyboard-scrollable code regions. */
const getCodeRegionLabels = (page: Page): Promise<string[]> =>
  page
    .locator('pre[role="region"]')
    .evaluateAll((regions) => regions.map((region) => region.getAttribute('aria-label') ?? ''));

test('follows one project change through five connected stages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);

  await expect(
    page.getByRole('heading', { level: 1, name: 'One change, followed all the way through.' }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  await expect(page.getByText(LANDING_EXAMPLE.maintenanceRequest, { exact: true })).toBeVisible();
  await expect(
    page.getByText('I updated the refund rule and everything connected to it.', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-workflow-stage]')).toHaveCount(5);
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }).locator('a[aria-current="page"]'),
  ).toHaveText('How it works');

  const stageIds = await page
    .locator('[data-workflow-stage]')
    .evaluateAll((stages) => stages.map((stage) => stage.id));
  expect(stageIds).toStrictEqual([
    'project-context',
    'connections',
    'changes',
    'checks',
    'next-session',
  ]);
  await expect(page.locator('[data-change-previews]')).toContainText(
    LANDING_EXAMPLE_PREVIEW.policyDiff.source,
  );
  await expect(page.locator('[data-change-previews]')).toContainText(
    LANDING_EXAMPLE_PREVIEW.instructionDiff.source,
  );
  await expect(page.locator('[data-check-layers] > article')).toHaveCount(3);
  await expect(page.locator('[data-connection-map]')).toContainText(
    'One saved rule, four explicit connections.',
  );
  await expect(page.locator('[data-connection-map]')).toContainText('gpt-6-astra');
  await expect(page.locator('#changes').getByText('14 days', { exact: true })).toBeVisible();
  await expect(page.locator('#changes').getByText('15 days', { exact: true })).toBeVisible();
  await expect(page.locator('[data-adapter-check]')).toContainText(
    'It supplements this project workflow.',
  );
  await expect(
    page.getByText('This is saved project context, not automatic model memory.'),
  ).toBeVisible();
  await expect(page.locator('[data-change-previews] [data-code-copy-button]')).toHaveCount(0);

  const plainBrandMentions = await page.locator('body').evaluate((body) => {
    const iterator = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const invalidMentions: string[] = [];
    let currentNode = iterator.nextNode();

    while (currentNode !== null) {
      if (
        /\bmoldea\b/iu.test(currentNode.textContent ?? '') &&
        currentNode.parentElement?.closest('code') === null
      ) {
        invalidMentions.push(currentNode.textContent?.trim() ?? '');
      }
      currentNode = iterator.nextNode();
    }

    return invalidMentions;
  });
  expect(plainBrandMentions).toStrictEqual([]);

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toStrictEqual([]);
});

test('keeps both visual narratives and their technical links available without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(toPublicPath('/capabilities/'));
  await expect(
    page.getByRole('heading', { level: 1, name: 'From project knowledge to working agents.' }),
  ).toBeVisible();
  await expect(page.locator('[data-capability-section]')).toHaveCount(6);
  await expect(page.getByRole('link', { name: 'Project state guide' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/project-state/'),
  );
  const capabilityCodeLabels = await getCodeRegionLabels(page);
  expect(capabilityCodeLabels).toHaveLength(4);
  expect(new Set(capabilityCodeLabels).size).toBe(capabilityCodeLabels.length);
  expect(capabilityCodeLabels.every((label) => label.length > 0)).toBe(true);

  await page.goto(route);
  await expect(page.locator('[data-workflow-stage]')).toHaveCount(5);
  await expect(page.getByRole('link', { name: 'Open evidence' })).toHaveAttribute(
    'href',
    toPublicPath('/evidence/'),
  );
  const workflowCodeLabels = await getCodeRegionLabels(page);
  expect(workflowCodeLabels).toHaveLength(2);
  expect(new Set(workflowCodeLabels).size).toBe(workflowCodeLabels.length);
  expect(workflowCodeLabels.every((label) => label.length > 0)).toBe(true);

  await context.close();
});

test('keeps the complete workflow readable at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 900, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(route);

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth, colorScheme).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.locator('[data-workflow-conversation]')).toBeVisible();
    await expect(page.locator('[data-connection-map]')).toBeVisible();
    await expect(page.locator('[data-next-session-visual]')).toBeVisible();

    const stagesLink = page.locator('a[href="#project-context"]');
    await stagesLink.focus();
    await expect(stagesLink).toBeFocused();

    await context.close();
  }
});
