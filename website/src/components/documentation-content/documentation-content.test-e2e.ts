import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { ISearchDocument } from '@moldea.ai/website-ui/search';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;

test('shows the overview prompts as three separate conversations', async ({ page }) => {
  await page.goto(withBase('/docs/', basePath));
  const conversations = page.locator('main [data-conversation]');
  await expect(conversations).toHaveCount(3);
  await expect(conversations.nth(0)).toContainText(
    'Create a customer-support agent grounded in this repository.',
  );
  await expect(conversations.nth(1)).toContainText(
    'Update the refund flow and keep the support agent aligned.',
  );
  await expect(conversations.nth(2)).toContainText(
    'Evaluate the current project context without changing files.',
  );
  for (const conversation of await conversations.all()) {
    await expect(conversation.locator('[data-conversation-message]')).toHaveCount(1);
  }
});

test('renders authored turns in order while preserving document navigation and technical tokens', async ({
  page,
  request,
}) => {
  await page.goto(withBase('/examples/initialize-a-project/', basePath));
  const messages = page.locator('main [data-conversation-message]');
  await expect(messages).toHaveCount(6);
  expect(
    await messages.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-conversation-message')),
    ),
  ).toStrictEqual(['user', 'assistant', 'assistant', 'user', 'assistant', 'assistant']);
  await expect(messages.nth(3).locator('code')).toHaveText('product-brief.md');
  await expect(messages.nth(5).getByRole('list')).toContainText('Review the project foundation.');
  await expect(
    page.getByRole('heading', { name: 'Some context, but a material gap', exact: true }),
  ).toHaveAttribute('id', 'some-context-but-a-material-gap');
  await expect(page.locator('main pre code')).toContainText('moldea/');
  await expect(page.getByRole('link', { name: 'View source' })).toHaveAttribute(
    'href',
    'https://github.com/moldea-ai/skill/blob/main/docs/examples/initialize-a-project.md',
  );
  const llms = await request.get(withBase('/llms.txt', basePath));
  expect(llms.ok()).toBe(true);
  expect(await llms.text()).toContain('/examples/initialize-a-project/');
  const search = await request.get(withBase('/search-index.json', basePath));
  const records = (await search.json()) as ISearchDocument[];
  expect(
    records.find(({ url }) => url === withBase('/examples/initialize-a-project/', basePath))
      ?.searchText,
  ).toContain('Initialization completed');
});

for (const width of [320, 768, 1440]) {
  test(`keeps authored conversations accessible at ${width}px in both themes`, async ({
    browser,
  }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      const context = await browser.newContext({
        colorScheme,
        reducedMotion: 'reduce',
        viewport: { width, height: 900 },
      });
      try {
        const page = await context.newPage();
        await page.goto(withBase('/examples/create-a-support-agent/', basePath));
        await expect(page.getByRole('list', { name: 'Illustrative conversation' })).toBeVisible();
        await expect(page.getByRole('article', { name: 'You message' })).toBeVisible();
        await expect(page.locator('[data-conversation-message="user"] svg')).toBeVisible();
        await expect(page.getByRole('article', { name: 'Coding agent message' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          width,
        );
        expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toStrictEqual(
          [],
        );
      } finally {
        await context.close();
      }
    }
  });
}

test('keeps conversation turns available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto(withBase('/examples/create-a-support-agent/', basePath));
    await expect(page.getByRole('article', { name: 'You message' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Coding agent message' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
  } finally {
    await context.close();
  }
});
