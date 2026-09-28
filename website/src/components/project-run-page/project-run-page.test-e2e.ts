import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const detailPath = withBase(
  '/evidence/project-runs/projects/project-1/',
  process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH,
);

test('preserves intervention context, source links, and keyboard disclosure', async ({ page }) => {
  await page.goto(detailPath);
  await expect(page.getByText(/The timezone correction required a developer prompt/)).toBeVisible();
  await expect(page.locator('[data-evidence-status]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Explore the code', exact: true })).toHaveAttribute(
    'href',
    `https://github.com/moldea-ai/moldea-mock-project-public/tree/${'c'.repeat(40)}`,
  );
  await expect(page.getByRole('link', { name: 'Full record', exact: true })).toHaveAttribute(
    'href',
    `https://github.com/moldea-ai/moldea-mock-project-public/blob/${'a'.repeat(40)}/evidence/attempt-1.json`,
  );
  await expect(page.locator('#full-request')).not.toHaveAttribute('open');
  await page.locator('#full-request > summary').click();
  await expect(page.locator('#full-request')).toContainText(
    'Existing customers should receive the same reminder content.',
  );
  const summary = page.locator('#project-follow-up > summary');
  await page.keyboard.press('Tab');
  await expect(summary).toBeFocused();
  expect(await summary.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('The policy and implementation relationship were checked.', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('The policy and implementation relationship were checked.', { exact: true }),
  ).toBeHidden();
});

test('keeps the story and native disclosure usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(detailPath);
    await expect(page.getByRole('heading', { name: 'What happened' })).toBeVisible();
    await page.locator('#project-follow-up > summary').click();
    await expect(
      page.getByText('The policy and implementation relationship were checked.', { exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
