import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const route = withBase('/docs/limitations/', basePath);

test('connects the limitations guide to source, navigation, and result meanings', async ({
  page,
}) => {
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Limitations and how they’re handled',
  );
  await expect(page.getByRole('link', { name: 'View source' })).toHaveAttribute(
    'href',
    'https://github.com/moldea-ai/skill/blob/main/docs/limitations.md',
  );
  await expect(
    page
      .getByRole('navigation', { name: 'Documentation navigation' })
      .getByRole('link', { name: 'Limitations', exact: true })
      .filter({ visible: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('navigation', { name: 'Previous and next documentation' }).getByRole('link'),
  ).toHaveCount(2);
  await expect(page.locator('[data-markdown-badge]')).toHaveText([
    'Completed',
    'Error',
    'Unverified',
    'Unfinished',
  ]);
  await expect(page.getByRole('table').first()).toContainText(
    'It can still contain errors or unverified relationships',
  );
  await page
    .getByRole('navigation', { name: 'On this page' })
    .filter({ visible: true })
    .getByRole('link', { name: 'Large projects and files' })
    .click();
  await expect(page).toHaveURL(/#large-projects-and-files$/u);
  await expect(page.getByRole('heading', { name: 'Large projects and files' })).toBeInViewport();
});

test('finds the guide through local search and client navigation', async ({ page }) => {
  await page.goto(withBase('/search/', basePath));
  const input = page.getByRole('searchbox', { name: 'Search documentation' });
  await input.fill('limitations');
  await input.press('Enter');
  await page.locator(`[data-search-results] a[href="${route}"]`).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Limitations and how they’re handled',
  );
  await expect(page.locator('[data-markdown-badge]')).toHaveCount(4);
});

for (const width of [320, 768, 1440]) {
  test(`keeps limitations readable and accessible at ${width}px in both themes`, async ({
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
        await page.goto(route);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        await expect(page.locator('[data-markdown-badge]')).toHaveCount(4);
        for (const name of ['Result meanings', 'Common situations', 'Resource boundaries']) {
          await expect(page.getByRole('region', { name, exact: true })).toHaveCount(1);
        }
        if (width === 320) {
          const table = page.getByRole('region', { name: 'Result meanings', exact: true });
          await table.focus();
          await page.keyboard.press('ArrowRight');
          await expect
            .poll(() => table.evaluate((element) => element.scrollLeft))
            .toBeGreaterThan(0);
        }
        const source = page.getByRole('link', { name: 'View source' });
        await page.keyboard.press('Tab');
        await source.focus();
        await expect(source).toBeFocused();
        expect(
          await source.evaluate((element) => {
            const style = getComputedStyle(element);
            return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
          }),
        ).toBe(true);
        if (width === 1440) {
          await expect(
            page.getByRole('complementary', { name: 'Documentation navigation', exact: true }),
          ).toHaveCount(1);
          await expect(
            page.getByRole('complementary', { name: 'On this page', exact: true }),
          ).toHaveCount(1);
        }
        const navigationBottom = await page
          .getByRole('navigation', { name: 'Previous and next documentation' })
          .evaluate((element) => element.getBoundingClientRect().bottom);
        const footerTop = await page
          .getByRole('contentinfo')
          .evaluate((element) => element.getBoundingClientRect().top);
        expect(footerTop - navigationBottom).toBeGreaterThanOrEqual(32);
        expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
      } finally {
        await context.close();
      }
    }
  });
}

test('keeps the guide readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.getByRole('table')).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Core limits', exact: true })).toHaveAttribute(
      'href',
      'https://packages.moldea.ai/packages/core/repository-inspection/#resource-limits',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await context.close();
  }
});
