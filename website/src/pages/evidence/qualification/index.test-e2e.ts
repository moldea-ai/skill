import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('leads from a passing profile to its current inspectable attempt', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Adapter qualification evidence' }),
  ).toBeVisible();
  const profileLink = page.getByRole('link', { name: /Custom runtime qualification/ });
  await expect(profileLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    'passed',
  );
  await profileLink.click();
  await expect(page.getByRole('heading', { name: 'Qualification status summary' })).toBeVisible();
  await expect(page.getByText('Current result')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inspect the passing attempt' })).toBeVisible();
});

test('keeps qualification evidence accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();

    for (const route of ['/evidence/qualification/', '/evidence/qualification/custom/custom/']) {
      await page.goto(toPublicPath(route));
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll, route).toBeLessThanOrEqual(widths.client);
      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(
        accessibilityResults.violations.filter(
          ({ impact }) => impact === 'critical' || impact === 'serious',
        ),
        route,
      ).toStrictEqual([]);
    }

    await context.close();
  }
});
