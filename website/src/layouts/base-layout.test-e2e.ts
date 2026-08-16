import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { PACKAGES_WEBSITE_URL, SKILLS_DIRECTORY_URL } from '../lib/model/constants.ts';
import { parseSearchDocuments } from '../lib/search/search.ts';
import { DEFAULT_BASE_PATH, withBase } from '../lib/site/url.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);
const REPRESENTATIVE_PATHS = [
  '/',
  '/docs/',
  '/docs/capabilities/',
  '/docs/how-it-works/',
  '/docs/safety-and-privacy/',
  '/examples/',
  '/examples/create-a-support-agent/',
  '/examples/evaluate-and-reconcile/',
  '/search/',
] as const;

/** Loads every public content route from the generated local search boundary. */
const getPublicContentPaths = async (page: Page): Promise<string[]> => {
  const response = await page.request.get(toPublicPath('/search-index.json'));

  expect(response.ok()).toBe(true);

  const searchIndex = parseSearchDocuments((await response.json()) as unknown);

  return [
    ...new Set([
      toPublicPath('/'),
      toPublicPath('/404.html'),
      toPublicPath('/search/'),
      ...searchIndex.map(({ url }) => url),
    ]),
  ];
};

test('makes skills.sh the primary distribution path on desktop and mobile', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'You keep shipping. Agents stay grounded.' }),
  ).toBeVisible();
  const heroTitleLineTops = await page.locator('[data-hero-title]').evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);

    return [...range.getClientRects()].map(({ top }) => Math.round(top));
  });
  expect(new Set(heroTitleLineTops).size).toBe(2);

  const faviconLink = page.locator('link[rel="icon"]');
  await expect(faviconLink).toHaveAttribute('href', `${toPublicPath('/favicon.ico')}?v=a8cfe06f`);
  await expect(faviconLink).toHaveAttribute('type', 'image/x-icon');

  const outcomeHeading = page.getByRole('heading', {
    level: 2,
    name: 'Ask for outcomes, not moldea operations.',
  });
  const brandedProductName = outcomeHeading.locator('code');
  await expect(brandedProductName).toHaveText('moldea');
  await expect(brandedProductName).toHaveClass(/bg-code/);

  const primaryLink = page
    .getByRole('link', { name: 'Get moldea on skills.sh', exact: true })
    .first();
  await expect(primaryLink).toBeVisible();
  await expect(primaryLink).toHaveAttribute('href', SKILLS_DIRECTORY_URL);
  await expect(primaryLink.locator('code')).toHaveCount(0);

  const heroActionTopOffsets = await page
    .locator('[data-hero-actions] > a')
    .evaluateAll((elements) => elements.map((element) => (element as HTMLElement).offsetTop));
  expect(new Set(heroActionTopOffsets).size).toBe(1);

  await page.setViewportSize({ height: 740, width: 320 });
  await page.reload();
  await page.getByLabel('Open navigation').click();

  const mobileDistributionLink = page.getByRole('link', {
    name: 'Get the skill on skills.sh',
    exact: true,
  });
  await expect(mobileDistributionLink).toBeVisible();
  await expect(mobileDistributionLink).toHaveAttribute('href', SKILLS_DIRECTORY_URL);
});

test('shows the complete two-step initialization journey', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const simulation = page.getByLabel('Getting started simulation');
  await expect(
    page.getByRole('heading', { level: 2, name: 'One install. One ordinary request.' }),
  ).toBeVisible();
  await expect(simulation.getByText('npx skills add moldea-ai/skill')).toBeVisible();
  await expect(simulation.getByText('Initialize moldea for this repository.')).toBeVisible();
  await expect(simulation.getByText('Reads your project')).toBeVisible();
  await expect(simulation.getByText('Builds grounded context')).toBeVisible();
  await expect(simulation.getByText('Checks its work')).toBeVisible();
  await expect(simulation.getByText(/Keep working with your coding agent as usual/)).toBeVisible();

  const packagesLink = page.getByRole('link', { name: 'Built on moldea packages' });
  await expect(packagesLink).toHaveAttribute('href', PACKAGES_WEBSITE_URL);
  await expect(packagesLink).toHaveAttribute('target', '_blank');
});

test('keeps documentation samples and navigation readable at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  const installCommand = page.getByText('npx skills add moldea-ai/skill', { exact: true });
  const installCommandWidths = await installCommand.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));

  expect(installCommandWidths.scroll).toBeLessThanOrEqual(installCommandWidths.client);

  await page.goto(toPublicPath('/examples/create-a-support-agent/'));

  const sample = page.locator('.prose-moldea pre').nth(1);
  const sampleWidths = await sample.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));

  expect(sampleWidths.scroll).toBeLessThanOrEqual(sampleWidths.client);

  const sectionHeadings = page.locator('.prose-moldea > h2');
  expect(
    await sectionHeadings.first().evaluate((element) => getComputedStyle(element).borderTopWidth),
  ).toBe('0px');
  expect(
    Number.parseFloat(
      await sectionHeadings.nth(1).evaluate((element) => getComputedStyle(element).borderTopWidth),
    ),
  ).toBeGreaterThan(0);

  const nextPageText = page
    .getByRole('navigation', { name: 'Previous and next documentation' })
    .getByText('Next', { exact: true })
    .locator('..');
  expect(await nextPageText.evaluate((element) => getComputedStyle(element).textAlign)).toBe('end');
});

test('persists an explicit theme and exposes mobile navigation from the keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  await expect(page.locator('header img[src$="/logo/logo-light.png"]')).toBeVisible();

  const navigationButton = page.getByLabel('Open navigation');
  await navigationButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();

  const themeControl = page.getByRole('button', { name: 'Use dark theme' }).last();
  await themeControl.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('header img[src$="/logo/logo-dark.png"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await navigationButton.click();
  await expect(page.getByRole('button', { name: 'Use light theme' }).last()).toBeVisible();
});

test('uses smooth client navigation while preserving ordinary static routes', async ({ page }) => {
  await page.goto(toPublicPath('/'));
  await expect(page.locator('meta[name="astro-view-transitions-enabled"]')).toHaveAttribute(
    'content',
    'true',
  );

  const navigationMarker = await page.evaluate(() => {
    const marker = crypto.randomUUID();
    (window as Window & { __skillNavigationMarker?: string }).__skillNavigationMarker = marker;

    return marker;
  });

  await page.getByRole('link', { name: 'Capabilities', exact: true }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'What the skill can do' }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(toPublicPath('/docs/capabilities/'));
  expect(
    await page.evaluate(
      () => (window as Window & { __skillNavigationMarker?: string }).__skillNavigationMarker,
    ),
  ).toBe(navigationMarker);
});

test('has no page-level horizontal overflow at 320px on every public route', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  const paths = await getPublicContentPaths(page);

  for (const path of paths) {
    await page.goto(path);
    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));

    expect(widths.scroll, `${path} overflows horizontally`).toBeLessThanOrEqual(widths.client);
  }
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`keeps every public route accessible at 320px in ${colorScheme} mode`, async ({
    browser,
  }) => {
    test.slow();

    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    const paths = await getPublicContentPaths(page);

    for (const path of paths) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const materialViolations = results.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      );

      expect(
        materialViolations,
        `${path} has material accessibility violations in ${colorScheme} mode`,
      ).toStrictEqual([]);
    }

    await context.close();
  });
}

test('keeps representative routes free of serious automated accessibility violations', async ({
  page,
}) => {
  for (const path of REPRESENTATIVE_PATHS) {
    await page.goto(toPublicPath(path));
    const results = await new AxeBuilder({ page }).analyze();
    const materialViolations = results.violations.filter(
      ({ impact }) => impact === 'critical' || impact === 'serious',
    );

    expect(materialViolations, `${path} has material accessibility violations`).toStrictEqual([]);
  }
});

test('renders every reader-facing product mention as inline code', async ({ page }) => {
  await page.goto(toPublicPath('/'));
  const searchIndex: unknown = await page.evaluate(async (url) => {
    const response = await fetch(url);

    return (await response.json()) as unknown;
  }, toPublicPath('/search-index.json'));
  const productPresentationPaths = [
    toPublicPath('/'),
    toPublicPath('/404.html'),
    toPublicPath('/search/'),
    ...parseSearchDocuments(searchIndex).map(({ url }) => url),
  ];

  for (const path of new Set(productPresentationPaths)) {
    await page.goto(path);
    const unstyledMentions = await page.locator('body').evaluate((body) => {
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const matches: string[] = [];
      let currentNode = walker.nextNode();

      while (currentNode) {
        const parent = currentNode.parentElement;
        const text = currentNode.textContent ?? '';

        if (
          /\bmoldea\b/iu.test(text) &&
          parent &&
          !parent.closest('code, script, style, noscript, [data-brand-plain]')
        ) {
          matches.push(text.trim());
        }

        currentNode = walker.nextNode();
      }

      return matches;
    });

    expect(unstyledMentions, `${path} has unstyled product mentions`).toStrictEqual([]);
  }
});

test('copies the install command and searches the generated local index', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(toPublicPath('/'));
  await page.getByRole('button', { name: 'Copy install command' }).click();
  await expect(page.locator('[data-getting-started-copy-status]')).toHaveText(
    'Install command copied to the clipboard.',
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'npx skills add moldea-ai/skill',
  );

  await page.getByRole('link', { name: 'Search documentation' }).click();
  await page.getByRole('searchbox', { name: 'Search documentation' }).fill('support agent');
  await page.getByRole('searchbox', { name: 'Search documentation' }).press('Enter');
  await expect(page.locator('[data-search-results] li').first()).toBeVisible();
  await expect(page.locator('[data-search-status]')).toContainText(/results? for “support agent”/);
});

test('keeps essential documentation available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(toPublicPath('/docs/getting-started/'));
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible();
  await expect(page.getByText(/The primary distribution page is/)).toBeVisible();

  await context.close();
});

test('honors the reduced-motion media preference', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();

  await page.goto(toPublicPath('/'));
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
  const transitionDuration = await page
    .locator('.interactive-card')
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(transitionDuration).toBeLessThanOrEqual(0.01);

  await context.close();
});
