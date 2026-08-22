import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('explains every passing semantic scenario through keyboard-accessible disclosure', async ({
  page,
}) => {
  await page.goto(toPublicPath('/evidence/semantic/'));

  await expect(page.getByRole('heading', { level: 1, name: 'Semantic evaluation' })).toBeVisible();
  await expect(page.getByText('44/44 scenarios')).toBeVisible();
  const firstScenario = page.locator('main details').first();
  const summary = firstScenario.locator('summary');
  await summary.focus();
  await summary.press('Enter');
  await expect(firstScenario.getByRole('heading', { name: 'What had to happen' })).toBeVisible();
  await expect(firstScenario.getByRole('heading', { name: 'What must not happen' })).toBeVisible();
  await expect(firstScenario.getByRole('heading', { name: 'Why it passed' })).toBeVisible();
});

test('keeps semantic evidence accessible without JavaScript and at 320px', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      javaScriptEnabled: false,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/evidence/semantic/'));

    const firstScenario = page.locator('main details').first();
    await firstScenario.locator('summary').click();
    await expect(firstScenario.getByRole('heading', { name: 'Why it passed' })).toBeVisible();
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
