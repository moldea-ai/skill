import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('presents both evidence types with their current status', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/qualification/'));
  const qualificationStatuses = await page
    .getByRole('link', { name: /qualification/iu })
    .locator('[data-evidence-status]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-evidence-status') ?? 'not-recorded'),
    );
  const qualificationStatus = qualificationStatuses.includes('errored')
    ? 'errored'
    : qualificationStatuses.includes('failed')
      ? 'failed'
      : qualificationStatuses.includes('not-recorded')
        ? 'not-recorded'
        : 'passed';

  await page.goto(toPublicPath('/evidence/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the evidence you need.' }),
  ).toBeVisible();
  const semanticLink = page.getByRole('link', { name: /Semantic evaluation/ });
  const qualificationLink = page.getByRole('link', { name: /Adapter qualification/ });
  await expect(semanticLink).toContainText('Passed');
  await expect(semanticLink).toContainText('47 of 47 scenarios passed');
  await expect(qualificationLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    qualificationStatus,
  );
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
