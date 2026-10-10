import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const route = withBase('/capabilities/', basePath);

test('presents all six capabilities as distinct visual outcomes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Project context first. Agent capabilities when you need them.',
    }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  await expect(page.locator('[data-capability-section]')).toHaveCount(6);
  await expect(page.locator('[data-capability-conversation]')).toHaveCount(6);
  await expect(page.locator('[data-capability-load]')).toHaveCount(0);
  await expect(page.getByText('Illustrative conversations.', { exact: false })).toBeVisible();
  await expect(page.locator('#evaluate-and-repair [data-repair-visual]')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }).locator('a[aria-current="page"]'),
  ).toHaveText('Capabilities');

  for (const heading of [
    'Give every session the same starting point.',
    'Put each responsibility where it belongs.',
    'Build an agent from real project boundaries.',
    'Package a repeatable workflow, not just a prompt.',
    'Change one rule. Follow every connection.',
    'Inspect first. Repair only when asked.',
  ]) {
    await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
  }

  await expect(page.getByRole('img', { name: 'OpenAI company logo' })).toBeVisible();
  await expect(
    page.getByText('Declared connections are checked. Refund approval stays in the application.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('[data-maintenance-visual] [data-code-copy-button]')).toHaveCount(0);
  await expect(page.getByText('Fix moldea.', { exact: true }).locator('code')).toHaveText('moldea');
  await expect(page.getByText('Planning is read-only.', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Repair uses established project evidence', { exact: false }),
  ).toContainText('reports any checks it could not complete');
  await expect(page.getByRole('list', { name: 'Saved project files' })).toContainText('refunds.md');
  await expect(page.getByRole('list', { name: 'Release review skill files' })).toContainText(
    'verify.mjs',
  );
  await expect(page.getByText('$49.99 is paid. $50 is free.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'See the planning example' })).toHaveAttribute(
    'href',
    withBase('/examples/plan-an-agent-system/', basePath),
  );
  await expect(page.getByRole('link', { name: 'Repair and evaluation guide' })).toHaveAttribute(
    'href',
    withBase('/docs/evaluate-reconcile-validate/#repair-a-project', basePath),
  );

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

  await page
    .getByLabel('See these capabilities work')
    .getByRole('link', { name: 'How it works', exact: true })
    .click();
  await expect(page).toHaveURL(/\/how-it-works\/$/u);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'From project context to a working agent.',
    }),
  ).toBeVisible();
});

for (const width of [320, 768, 1440]) {
  test(`keeps the capability journey usable at ${width}px in both themes`, async ({ browser }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        colorScheme,
        reducedMotion: 'reduce',
        viewport: { height: 900, width },
      });
      try {
        const page = await context.newPage();
        await page.goto(route);

        const dimensions = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));
        expect(dimensions.documentWidth, colorScheme).toBeLessThanOrEqual(dimensions.viewportWidth);
        await expect(page.locator('[data-project-truth-visual]')).toBeVisible();
        await expect(page.locator('[data-maintenance-visual]')).toBeVisible();
        await expect(page.locator('[data-repair-visual]')).toBeVisible();

        const firstAnchor = page.getByRole('link', { name: 'Establish project truth' });
        await firstAnchor.focus();
        await expect(firstAnchor).toBeFocused();
        expect(
          await firstAnchor.evaluate((element) => getComputedStyle(element).outlineStyle),
        ).not.toBe('none');
        expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
      } finally {
        await context.close();
      }
    }
  });
}

test('keeps all six journeys readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.locator('[data-capability-conversation]')).toHaveCount(6);
    await expect(page.locator('[data-repair-visual]')).toContainText(
      'Deterministic validation passed',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
