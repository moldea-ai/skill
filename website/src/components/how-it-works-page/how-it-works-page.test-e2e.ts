import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const route = withBase('/how-it-works/', basePath);
const toPublicPath = (publicRoute: string): string => withBase(publicRoute, basePath);

test('follows one booking request through five connected stages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Your request is one sentence. The work stays connected.',
    }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  await expect(
    page.getByText(
      'Make our booking assistant offer only available times and send same-day requests to staff.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      'I connected live availability, kept same-day approval in the scheduling service, and checked the complete flow.',
      { exact: true },
    ),
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
    'connected-change',
    'verification',
    'next-session',
  ]);
  await expect(page.locator('[data-context-selection]')).toContainText(
    'Same-day requests need staff approval.',
  );
  await expect(page.locator('[data-connection-map] > div:last-of-type > article')).toHaveCount(4);
  await expect(page.locator('[data-connection-map]')).toContainText(
    'Four affected parts found before the first edit.',
  );
  await expect(page.locator('[data-connected-change]')).toContainText(
    'Each rule keeps one owner. No duplicate prompt policy.',
  );
  await expect(page.locator('[data-verification-row]')).toHaveCount(4);
  await expect(page.locator('[data-verification-row="deterministic"]')).toContainText(
    'Deterministic validation returns the same answer for the same project state.',
  );
  await expect(
    page.getByText('Project memory, available when the next task needs it.'),
  ).toBeVisible();
  await expect(page.locator('[data-code-copy-button]')).toHaveCount(0);

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

  await page.goto(route);
  await expect(page.locator('[data-workflow-stage]')).toHaveCount(5);
  await expect(
    page.getByRole('link', { name: 'Inspect the evidence', exact: true }),
  ).toHaveAttribute('href', toPublicPath('/evidence/'));
  await expect(
    page.getByRole('link', { name: 'Read the technical workflow', exact: true }),
  ).toHaveAttribute('href', toPublicPath('/docs/how-it-works/'));

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
    await expect(page.locator('[data-verification-board]')).toBeVisible();
    await expect(page.locator('[data-next-session-visual]')).toBeVisible();

    const workflowLink = page.getByRole('link', { name: 'Follow the workflow' });
    await workflowLink.focus();
    await expect(workflowLink).toBeFocused();

    await context.close();
  }
});
