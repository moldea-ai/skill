import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const toPublicPath = (route: string) =>
  withBase(route, process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);
const route = toPublicPath('/evidence/journeys/initialize/');

test('shows exact requests and replies with file changes and separate local checks', async ({
  page,
}) => {
  await page.goto(route);
  const provider = page.locator('[data-journey-provider="claude"]');
  await expect(provider.locator('[data-journey-request]').first()).toHaveText('Initialize moldea.');
  await expect(provider.getByText(/^Request \d+$/u)).toHaveCount(0);
  await expect(provider.locator('[data-conversation-message="assistant"]').first()).toContainText(
    'Validation reports valid.',
  );
  await expect(provider.locator('[data-recorded-file-tree]').first()).toBeVisible();
  await expect(provider.locator('[data-recorded-file-tree]').first()).toContainText('moldea.yaml');
  await expect(provider.locator('[data-conversation-message="assistant"] .lucide-bot')).toHaveCount(
    0,
  );
  await expect(
    provider.locator('[data-conversation-message="assistant"] img').first(),
  ).toHaveAttribute('src', toPublicPath('/logo/icon-xs-light.png'));
  const result = provider.locator('[data-journey-result]').first();
  await result.locator('[data-journey-diff] > summary').click();
  await expect(result.locator('[data-code-diff]')).toContainText(
    'The greeting service returns a personalized welcome.',
  );
  await result.locator('[data-local-checks] > summary').click();
  await expect(result).toContainText('File exists: moldea/project.md');
  await expect(result).toContainText('File exists: moldea/moldea.yaml');
  await expect(result.locator('[data-journey-check="passed"]')).toHaveCount(2);
  await expect(result.locator('[data-local-checks] [data-status-badge]')).toHaveCount(0);
  await result.locator('[data-capture-details] > summary').click();
  await expect(result).toContainText('Agent-reported activity is not an execution trace.');
  await expect(result.getByRole('link', { name: 'Raw patch', exact: true })).toHaveAttribute(
    'href',
    /changes\.patch$/u,
  );
  await expect(
    page.locator('script:not([src])').filter({ hasText: 'alert("unsafe")' }),
  ).toHaveCount(0);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test('uses keyboard platform tabs at mobile and desktop sizes', async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(route);
    const chatgpt = page.getByRole('tab', { name: 'ChatGPT', exact: true });
    const claude = page.getByRole('tab', { name: 'Claude', exact: true });
    await claude.focus();
    await page.keyboard.press('ArrowRight');
    await expect(chatgpt).toBeFocused();
    await expect(page.locator('[data-journey-provider="claude"]')).toBeHidden();
    await expect(page.locator('[data-journey-provider="chatgpt"]')).toBeVisible();
    await page.keyboard.press('Home');
    await expect(claude).toBeFocused();
    await page.keyboard.press('End');
    await expect(chatgpt).toBeFocused();
  }
});

test('groups a failed check with its explanation and the captured unexpected file change', async ({
  page,
}) => {
  await page.goto(toPublicPath('/evidence/journeys/preserve/'));
  const result = page.locator('[data-journey-provider="claude"] [data-journey-result]');
  await expect(result.locator('[data-recorded-file-tree]')).toContainText('project.md');
  await expect(result).not.toContainText('No files changed.');
  await result.locator('[data-local-checks] > summary').click();
  const check = result.locator('[data-journey-check="failed"]');
  await expect(check).toContainText('Expected no file changes');
  await expect(check).toContainText('Failed');
  await expect(check).toContainText('Unexpected change to project knowledge.');
  await expect(result.locator('[data-local-checks] [data-status-badge]')).toHaveCount(0);
});

test('keeps original failure visible and selects complete repeat conversations', async ({
  page,
}) => {
  await page.goto(toPublicPath('/evidence/journeys/recovered/'));
  await page.getByRole('tab', { name: 'ChatGPT', exact: true }).click();
  const provider = page.locator('[data-journey-provider="chatgpt"]');
  await expect(provider.locator('[data-journey-outcome]')).toHaveText('Passed on repeat');
  const history = provider.getByLabel('Run history');
  await expect(history).toContainText('First run Failed');
  await expect(history).toContainText('Repeat 1 Passed');
  const runs = provider.locator('[data-journey-run]');
  await expect(runs.nth(0)).toBeVisible();
  await expect(runs.nth(1)).toBeHidden();
  await provider.getByLabel('Show', { exact: true }).selectOption({ label: 'Repeat 1' });
  await expect(runs.nth(0)).toBeHidden();
  await expect(runs.nth(1)).toBeVisible();
  const result = runs.nth(1).locator('[data-journey-result]');
  await result.locator('[data-capture-details] > summary').click();
  await expect(result.getByRole('link', { name: 'Raw reply', exact: true })).toHaveAttribute(
    'href',
    /c1\/read\/reply.md$/u,
  );
  expect(
    await page
      .locator('[id]')
      .evaluateAll((elements) =>
        elements.map(({ id }) => id).filter((id, index, ids) => ids.indexOf(id) !== index),
      ),
  ).toStrictEqual([]);
});

test('preserves each provider request revision and raw source identity', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/journeys/additional-1/'));
  await page.getByRole('tab', { name: 'ChatGPT', exact: true }).click();
  const chatgpt = page.locator('[data-journey-provider="chatgpt"]');
  const claude = page.locator('[data-journey-provider="claude"]');
  await expect(chatgpt.locator('[data-journey-request]')).toHaveText(
    'Read the revised policy and preserve all saved project knowledge.',
  );
  await page.getByRole('tab', { name: 'Claude', exact: true }).click();
  await expect(claude.locator('[data-journey-request]')).toHaveText(
    'Read the saved project policy without editing files.',
  );
  for (const [platform, provider] of [
    ['chatgpt', chatgpt],
    ['claude', claude],
  ] as const) {
    await page
      .getByRole('tab', { name: platform === 'chatgpt' ? 'ChatGPT' : 'Claude', exact: true })
      .click();
    await provider.locator('[data-capture-details] > summary').click();
    const link = provider.getByRole('link', { name: 'Raw patch', exact: true });
    const url = await link.getAttribute('href');
    expect(url).toMatch(
      new RegExp(`sources/[a-f0-9]{16}/${platform}/additional-1/initial/read/changes.patch$`, 'u'),
    );
    expect((await page.request.get(url!)).status()).toBe(200);
  }
});

test('defaults to the available provider and makes missing coverage explicit', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/journeys/claude-only/'));
  await expect(page.getByRole('tab', { name: 'Claude', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: 'ChatGPT', exact: true }).click();
  await expect(page.getByText('Not run in ChatGPT.', { exact: true })).toBeVisible();
  await page.goto(toPublicPath('/evidence/journeys/additional-2/'));
  await expect(page.getByRole('tab', { name: 'ChatGPT', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('supports light, dark, reduced motion and narrow screens', async ({ browser }, testInfo) => {
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
    } finally {
      await context.close();
    }
  }
});

test('keeps partial, historical and repeat conversations readable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 1000 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.locator('[data-journey-provider="chatgpt"]')).toBeVisible();
    await expect(page.locator('[data-journey-provider="claude"]')).toBeVisible();
    await page.goto(toPublicPath('/evidence/journeys/additional-2/'));
    await expect(page.getByText('Not run in Claude.', { exact: true })).toBeVisible();
    await page.goto(toPublicPath('/evidence/journeys/additional-3/'));
    await expect(page.locator('[data-journey-result="claude"]')).toBeVisible();
    await page.goto(toPublicPath('/evidence/journeys/recovered/'));
    await expect(page.locator('[data-journey-provider="chatgpt"] [data-journey-run]')).toHaveCount(
      3,
    );
    for (const run of await page
      .locator('[data-journey-provider="chatgpt"] [data-journey-run]')
      .all())
      await expect(run).toBeVisible();
  } finally {
    await context.close();
  }
});
