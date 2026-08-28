import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('explains current semantic evidence through keyboard-accessible disclosure', async ({
  page,
}) => {
  await page.goto(toPublicPath('/evidence/semantic/'));

  await expect(page.getByRole('heading', { level: 1, name: 'Semantic evaluation' })).toBeVisible();
  await expect(page.getByText('54/54 scenarios', { exact: true })).toBeVisible();
  await expect(page.getByText('Passed', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Every recorded outcome remains available.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Inspect attempt/u })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Read the methodology' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/semantic-evaluation/'),
  );
  await expect(page.getByRole('link', { name: 'Inspect coverage map' })).toHaveAttribute(
    'href',
    /semantic-evaluation-coverage\.json$/u,
  );
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
    const noJavaScriptContext = await browser.newContext({
      colorScheme,
      javaScriptEnabled: false,
      viewport: { height: 740, width: 320 },
    });
    const noJavaScriptPage = await noJavaScriptContext.newPage();
    await noJavaScriptPage.goto(toPublicPath('/evidence/semantic/'));

    const firstScenario = noJavaScriptPage.locator('main details').first();
    await firstScenario.locator('summary').click();
    await expect(firstScenario.getByRole('heading', { name: 'Why it passed' })).toBeVisible();
    const widths = await noJavaScriptPage.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await noJavaScriptContext.close();

    const accessibilityContext = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const accessibilityPage = await accessibilityContext.newPage();
    await accessibilityPage.goto(toPublicPath('/evidence/semantic/'));
    const accessibilityResults = await new AxeBuilder({ page: accessibilityPage }).analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);

    await accessibilityContext.close();
  }
});
