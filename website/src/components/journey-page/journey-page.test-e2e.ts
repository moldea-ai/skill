import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const route = withBase(
  '/evidence/journeys/initialize/',
  process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH,
);

test('shows exact requests, real file trees and readable patch dialogs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route);
  const step = page.locator('[data-journey-step]').first();
  await expect(
    step.getByRole('heading', { name: 'Initialize moldea.', exact: true }),
  ).toBeVisible();
  await expect(step.locator('[data-recorded-file-tree]')).toHaveCount(2);
  await expect(step.getByText('Trusted local checks', { exact: true })).toHaveCount(2);
  const trigger = step.getByRole('button', { name: 'Inspect ChatGPT diff' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Recorded file changes', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-code-diff]')).toContainText(
    'The greeting service returns a personalized welcome.',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await step
    .locator('[data-journey-result="chatgpt"]')
    .getByText('Agent-reported reply', { exact: true })
    .click();
  await expect(step.locator('[data-journey-result="chatgpt"] .markdown-content')).toContainText(
    'Validation reports valid.',
  );
  await expect(
    page.locator('script:not([src])').filter({ hasText: 'alert("unsafe")' }),
  ).toHaveCount(0);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test('uses mobile keyboard tabs and keeps both desktop columns after resizing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto(route);
  const step = page.locator('[data-journey-step]').first();
  const chatgpt = step.getByRole('tab', { name: 'ChatGPT', exact: true });
  const claude = step.getByRole('tab', { name: 'Claude', exact: true });
  await expect(chatgpt).toHaveAttribute('aria-selected', 'true');
  await chatgpt.focus();
  await page.keyboard.press('ArrowRight');
  await expect(claude).toBeFocused();
  await expect(claude).toHaveAttribute('aria-selected', 'true');
  await expect(step.locator('[data-journey-result="chatgpt"]')).toBeHidden();
  await expect(step.locator('[data-journey-result="claude"]')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(chatgpt).toBeFocused();
  await page.keyboard.press('End');
  await expect(claude).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(step.getByRole('tablist')).toHaveCount(0);
  await expect(step.locator('[data-journey-result="chatgpt"]')).toBeVisible();
  await expect(step.locator('[data-journey-result="claude"]')).toBeVisible();
});

test('supports both themes, reduced motion and 320px without overflow', async ({
  browser,
}, testInfo) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(route);
        expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`journey-${colorScheme}-${width}.png`),
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 320, height: 1000 });
      await page.getByRole('button', { name: 'Inspect ChatGPT diff' }).first().click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
      expect(
        await page
          .getByRole('dialog')
          .evaluate((element) => getComputedStyle(element).animationName),
      ).toBe('none');
    } finally {
      await context.close();
    }
  }
});

test('keeps both platform results readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 1000 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    const step = page.locator('[data-journey-step]').first();
    await expect(step.locator('[data-journey-result="chatgpt"]')).toBeVisible();
    await expect(step.locator('[data-journey-result="claude"]')).toBeVisible();
    await expect(step.getByRole('link', { name: 'Raw patch' })).toHaveCount(2);
  } finally {
    await context.close();
  }
});

test('initializes comparisons and dialogs after repeated client navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  const gallery = withBase('/evidence/journeys/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);
  await page.goto(gallery);
  for (let visit = 0; visit < 2; visit += 1) {
    await page.getByRole('link', { name: /Initialize and validate/u }).click();
    const step = page.locator('[data-journey-step]').first();
    const chatgpt = step.getByRole('tab', { name: 'ChatGPT', exact: true });
    await chatgpt.focus();
    await page.keyboard.press('ArrowRight');
    await expect(step.getByRole('tab', { name: 'Claude', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await step.getByRole('button', { name: 'Inspect Claude diff' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Recorded file changes', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page
      .getByRole('link', { name: 'All journeys and run configuration', exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Follow the skill across a conversation.',
    );
  }
});

test('retains initial failure after recovery and exposes ordered confirmations with native keyboard disclosures', async ({
  page,
}) => {
  await page.goto(
    withBase('/evidence/journeys/recovered/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH),
  );
  const trials = page.locator('[data-journey-trials]').first();
  const initial = trials.locator('details[data-accordion-item]').first();
  await expect(initial).toHaveAttribute('open', '');
  await expect(initial.locator('[data-evidence-status="failed"]')).toHaveCount(3);
  const second = trials.locator('details[data-accordion-item]').nth(1);
  await second.locator(':scope > summary').focus();
  await page.keyboard.press('Enter');
  await expect(second).toHaveAttribute('open', '');
  await second.getByText('Agent-reported reply', { exact: true }).click();
  await expect(second.getByRole('link', { name: 'Raw reply' })).toHaveAttribute(
    'href',
    /c1\/read\/reply.md$/u,
  );
  expect(
    await page
      .locator('[id]')
      .evaluateAll((elements) =>
        elements.map((element) => element.id).filter((id, index, ids) => ids.indexOf(id) !== index),
      ),
  ).toStrictEqual([]);
});

test('defaults mobile to the available provider and keeps Not run discoverable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto(
    withBase('/evidence/journeys/claude-only/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH),
  );
  await expect(page.getByRole('tab', { name: 'Claude', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.locator('[data-journey-result="claude"]')).toBeVisible();
  await page.getByRole('tab', { name: 'ChatGPT', exact: true }).click();
  await expect(
    page.getByText('Not run in ChatGPT for this revision.', { exact: true }),
  ).toBeVisible();
});

test('keeps changed requests with their original provider, version and raw downloads', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto(
    withBase('/evidence/journeys/additional-1/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH),
  );
  const revisions = page.locator('[data-journey-revision]');
  await expect(revisions).toHaveCount(2);
  await expect(
    revisions
      .nth(0)
      .getByText('Read the revised policy and preserve all saved project knowledge.', {
        exact: true,
      }),
  ).toBeVisible();
  await expect(
    revisions
      .nth(1)
      .getByText('Read the saved project policy without editing files.', { exact: true }),
  ).toBeVisible();
  await expect(revisions.nth(0).locator('[data-journey-result="chatgpt"]')).toBeVisible();
  await expect(revisions.nth(0).locator('[data-journey-result="claude"]')).toHaveCount(0);
  await expect(revisions.nth(1).locator('[data-journey-result="claude"]')).toBeVisible();
  await expect(revisions.nth(1).locator('[data-journey-result="chatgpt"]')).toHaveCount(0);
  const links = [
    revisions.nth(0).getByRole('link', { name: 'Raw patch', exact: true }),
    revisions.nth(1).getByRole('link', { name: 'Raw patch', exact: true }),
  ];
  const urls = await Promise.all(links.map((link) => link.getAttribute('href')));
  expect(urls[0]).toMatch(
    /sources\/[a-f0-9]{16}\/chatgpt\/additional-1\/initial\/read\/changes.patch$/u,
  );
  expect(urls[1]).toMatch(
    /sources\/[a-f0-9]{16}\/claude\/additional-1\/initial\/read\/changes.patch$/u,
  );
  for (const url of urls) expect((await page.request.get(url!)).status()).toBe(200);
  expect(
    await page
      .locator('[id]')
      .evaluateAll((elements) =>
        elements.map(({ id }) => id).filter((id, index, ids) => ids.indexOf(id) !== index),
      ),
  ).toStrictEqual([]);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.screenshot({
        path: testInfo.outputPath(`revisions-${colorScheme}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test('shows new ChatGPT-only tests and historical evidence without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 1000 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    await page.goto(
      withBase('/evidence/journeys/additional-2/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH),
    );
    await expect(page.locator('[data-journey-result="chatgpt"]')).toBeVisible();
    await expect(
      page.getByText('Not run in Claude for this revision.', { exact: true }),
    ).toBeVisible();
    await page.goto(
      withBase('/evidence/journeys/additional-3/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH),
    );
    await expect(
      page.getByText('Historical requests · fixture identity unavailable', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-journey-result="claude"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
