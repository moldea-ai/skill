import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Route } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const toPublicPath = (route: string) =>
  withBase(route, process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);
const route = toPublicPath('/evidence/journeys/');

test('opens one conversation on demand without navigating and restores focus on close', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/journeys/initialize/')) requests.push(request.url());
  });
  await page.goto(route);
  await expect(page.locator('[data-journeys-matrix] > ul > li')).toHaveCount(16);
  await expect(page.locator('[data-journey-result]')).toHaveCount(0);
  expect(requests).toHaveLength(0);
  const trigger = page.getByRole('button', {
    name: 'Open Initialize and validate results',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Initialize and validate', exact: true });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.locator('[data-journey-provider="claude"] [data-journey-request]').first(),
  ).toHaveText('Initialize moldea.');
  await expect(dialog.getByText(/^Request \d+$/u)).toHaveCount(0);
  await expect(page).toHaveURL(route);
  await expect(
    dialog.locator('[data-journey-provider="claude"] [data-recorded-file-tree]').first(),
  ).toBeVisible();
  await dialog.getByRole('tab', { name: 'Claude', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('tab', { name: 'ChatGPT', exact: true })).toBeFocused();
  await expect(
    dialog.locator('[data-journey-provider="chatgpt"] [data-journey-request]').first(),
  ).toBeVisible();
  await dialog
    .locator('[data-journey-provider="chatgpt"] [data-journey-diff] > summary')
    .first()
    .click();
  await expect(
    dialog.locator('[data-journey-provider="chatgpt"] [data-code-diff]').first(),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toBeVisible();
  expect(requests).toHaveLength(1);
});

test('offers retry and a direct-page fallback when a conversation cannot load', async ({
  page,
}) => {
  const detail = toPublicPath('/evidence/journeys/initialize/');
  await page.route(`**${detail}`, (request) => request.abort());
  await page.goto(route);
  await page
    .getByRole('button', { name: 'Open Initialize and validate results', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Initialize and validate', exact: true });
  await expect(dialog.getByRole('status').first()).toContainText(
    'Could not load the conversation.',
  );
  await expect(
    dialog.getByRole('link', { name: 'Open the full page', exact: true }),
  ).toHaveAttribute('href', detail);
  await page.unroute(`**${detail}`);
  await dialog.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(
    dialog.locator('[data-journey-provider="chatgpt"] [data-journey-request]').first(),
  ).toHaveText('Initialize moldea.');
});

test('rejects a different deployed snapshot rather than mixing results', async ({ page }) => {
  await page.route(`**${toPublicPath('/evidence/journeys/initialize/')}`, async (request) => {
    const response = await request.fetch();
    await request.fulfill({
      response,
      body: (await response.text()).replace(
        /data-journey-snapshot="[^"]+"/u,
        'data-journey-snapshot="different-snapshot"',
      ),
    });
  });
  await page.goto(route);
  await page
    .getByRole('button', { name: 'Open Initialize and validate results', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Initialize and validate', exact: true });
  await expect(dialog.getByRole('status').first()).toContainText(
    'Could not load the conversation.',
  );
  await expect(dialog.locator('[data-journey-result]')).toHaveCount(0);
});

test('keeps technical sources collapsed and preserves their original identities', async ({
  page,
}) => {
  await page.goto(route);
  const sources = page.locator('[data-journey-sources]');
  await expect(sources).not.toHaveAttribute('open', '');
  await sources.locator(':scope > summary').click();
  for (const source of await sources.locator('details[data-accordion-item]').all())
    await source.locator(':scope > summary').click();
  await expect(sources.getByRole('link', { name: 'Raw assessment JSON' }).first()).toHaveAttribute(
    'href',
    /assessment\.json$/u,
  );
  await expect(sources.getByText('chatgpt fixture model', { exact: true }).first()).toBeVisible();
  await expect(sources.getByText('claude fixture model', { exact: true }).first()).toBeVisible();
});

test('supports dialog accessibility, both themes and 320px without overflow', async ({
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
        await page
          .getByRole('button', { name: 'Open Initialize and validate results', exact: true })
          .click();
        const dialog = page.getByRole('dialog', { name: 'Initialize and validate', exact: true });
        await expect(dialog.locator('[data-journey-request]').first()).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
        expect(
          await dialog.evaluate(
            (element) => element.getBoundingClientRect().width <= window.innerWidth,
          ),
        ).toBe(true);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`journeys-${colorScheme}-${width}.png`),
        });
        await page.keyboard.press('Escape');
      }
    } finally {
      await context.close();
    }
  }
});

test('paginates without preloading transcripts and initializes after client navigation', async ({
  page,
}) => {
  await page.goto(route);
  for (let visit = 0; visit < 2; visit += 1) {
    await page
      .getByRole('navigation', { name: 'Journey overview pages' })
      .getByRole('link', { name: 'Next page', exact: true })
      .click();
    await expect(page.locator('[data-journeys-matrix] > ul > li')).toHaveCount(3);
    await page
      .getByRole('navigation', { name: 'Journey overview pages' })
      .getByRole('link', { name: 'Previous page', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Open Confirmation example: recovered results', exact: true })
      .click();
    const dialog = page.getByRole('dialog', {
      name: 'Confirmation example: recovered',
      exact: true,
    });
    const provider = dialog.locator('[data-journey-provider="claude"]');
    await expect(provider.locator('[data-journey-run]').first()).toBeVisible();
    await provider.getByLabel('Show', { exact: true }).selectOption({ label: 'Repeat 2' });
    await expect(provider.locator('[data-journey-run]').nth(2)).toBeVisible();
    await page.keyboard.press('Escape');
  }
});

test('keeps direct journey links usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await page
      .getByRole('link', { name: 'Initialize and validate Open conversation', exact: true })
      .click();
    await expect(page).toHaveURL(toPublicPath('/evidence/journeys/initialize/'));
    await expect(page.locator('[data-journey-request]').first()).toHaveText('Initialize moldea.');
  } finally {
    await context.close();
  }
});

test('cancels a pending conversation on close and starts a fresh load on reopen', async ({
  page,
}) => {
  const detail = toPublicPath('/evidence/journeys/initialize/');
  let heldRequest: Route | undefined;
  let requestCount = 0;
  await page.route(`**${detail}`, async (request) => {
    requestCount += 1;
    if (requestCount === 1) heldRequest = request;
    else await request.continue();
  });
  try {
    await page.goto(route);
    const trigger = page.getByRole('button', {
      name: 'Open Initialize and validate results',
      exact: true,
    });
    await trigger.click();
    await expect.poll(() => requestCount).toBe(1);
    await page.keyboard.press('Escape');
    const dialog = page.getByRole('dialog', { name: 'Initialize and validate', exact: true });
    await expect(dialog).toBeHidden();
    await trigger.click();
    await expect(dialog.locator('[data-journey-request]').first()).toHaveText('Initialize moldea.');
    expect(requestCount).toBe(2);
    await expect(dialog.getByRole('button', { name: 'Try again', exact: true })).toBeHidden();
  } finally {
    await heldRequest?.abort();
  }
});

test('opens a provider-only journey on its recorded provider', async ({ page }) => {
  await page.goto(route);
  await page
    .getByRole('button', { name: 'Open Claude-only observation results', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Claude-only observation', exact: true });
  await expect(dialog.getByRole('tab', { name: 'Claude', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(
    dialog.locator('[data-journey-provider="claude"] [data-journey-result]'),
  ).toBeVisible();
  await dialog.getByRole('tab', { name: 'ChatGPT', exact: true }).click();
  await expect(dialog.getByText('Not run in ChatGPT.', { exact: true })).toBeVisible();
});

test('dismisses informational results from the overlay and restores the trigger focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route);
  const trigger = page.getByRole('button', {
    name: 'Open Initialize and validate results',
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Initialize and validate', exact: true });
  await expect(dialog.locator('[data-journey-request]').first()).toBeVisible();
  await dialog.getByRole('heading', { name: 'Initialize and validate', exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(8, 500);
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('paginates with an explicit current page and responsive previous and next controls', async ({
  page,
}) => {
  await page.goto(route);
  const navigation = page.getByRole('navigation', { name: 'Journey overview pages' });
  await expect(navigation.getByRole('link', { name: 'Page 1', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(navigation.getByRole('link', { name: 'Previous page', exact: true })).toHaveCount(0);
  await expect(page.getByText('Journeys 1–16 of 19', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 1000 });
  await navigation.getByRole('link', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('Journeys 17–19 of 19', { exact: true })).toBeVisible();
  await expect(navigation.getByText('Page 2 of 2', { exact: true })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Next page', exact: true })).toHaveCount(0);
  await navigation.getByRole('link', { name: 'Previous page', exact: true }).click();
  await expect(page).toHaveURL(route);
});
