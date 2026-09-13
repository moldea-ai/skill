import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('presents both evidence types with source-compatible status', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Keep the rules connected to the code.' }),
  ).toBeVisible();
  await expect(page.getByText('Saved rules', { exact: true })).toBeVisible();
  await expect(page.getByText('Connected files', { exact: true })).toBeVisible();
  await expect(page.getByText('Checks you can run again', { exact: true })).toBeVisible();
  await expect(page.getByText('find_order', { exact: true })).toBeVisible();
  await expect(page.getByText("name: 'lookup_order'", { exact: true })).toBeVisible();
  const integrationEvidence = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Does the integration keep references aligned?',
    }),
  });
  await expect(integrationEvidence.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    'not-recorded',
  );
  await expect(page.getByRole('link', { name: /Explore decision evidence/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Follow the adapter journey/ })).toBeVisible();
});

test('keeps the evidence overview accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/evidence/'));

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
