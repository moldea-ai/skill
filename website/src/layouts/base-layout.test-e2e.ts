import { createHash } from 'node:crypto';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { parseSearchDocuments } from '@moldea.ai/website-ui/search';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { PACKAGES_WEBSITE_URL, SKILLS_DIRECTORY_URL } from '../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);
const REPRESENTATIVE_PATHS = [
  '/',
  '/docs/',
  '/docs/capabilities/',
  '/docs/coding-agent-compatibility/',
  '/docs/how-it-works/',
  '/docs/safety-and-privacy/',
  '/examples/',
  '/examples/create-a-support-agent/',
  '/examples/evaluate-and-reconcile/',
  '/search/',
] as const;
const CODING_AGENT_MARKS = [
  {
    assetPath: '/coding-agents/codex.svg',
    height: 300,
    name: 'Codex',
    sha256: '69b404dd5243fbf5c6925e014429a676eba8214f928d814f7d4e920729d08f45',
    width: 300,
  },
  {
    assetPath: '/coding-agents/claude-code.svg',
    height: 248,
    name: 'Claude Code',
    sha256: 'b150888bc7257af83e3b85d3c2be4294f88986026f8168f6c12fc1fde6697350',
    width: 248,
  },
  {
    assetPath: '/coding-agents/cursor.svg',
    height: 532,
    name: 'Cursor',
    sha256: 'c483c02f78eb2619778fdd959e72a9adfac4844854472cd2653d4cbfd60e4d71',
    width: 467,
  },
  {
    assetPath: '/coding-agents/opencode.svg',
    height: 300,
    name: 'OpenCode',
    sha256: 'd6a0e3b8a295f413543f41cb73957e670351b5cb088c8d9dbd186b9e9d633cca',
    width: 300,
  },
  {
    assetPath: '/coding-agents/github-copilot.svg',
    height: 96,
    name: 'GitHub Copilot',
    sha256: 'd5aa364673444e6158fedb206efa2aa71886b465921d8911de3cb4e7a3a951bc',
    width: 96,
  },
  {
    assetPath: '/coding-agents/cline.svg',
    height: 96,
    name: 'Cline',
    sha256: 'e6bcb55005e9059434a990af23463819ef4eb17e86513ac22d92ea1c3fc36887',
    width: 92,
  },
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
    name: 'Outcomes, not moldea operations.',
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

test('shows compatible coding agents with source-owned marks and a complete docs path', async ({
  page,
}) => {
  await page.goto(toPublicPath('/'));

  const compatibilitySection = page.getByRole('region', {
    name: 'Use the coding agent you already trust.',
  });
  await expect(compatibilitySection).toBeVisible();

  const codingAgentMarks = compatibilitySection.locator('img');
  await expect(codingAgentMarks).toHaveCount(6);
  await expect
    .poll(() =>
      codingAgentMarks.evaluateAll((images) =>
        images.every(
          (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);

  for (const { assetPath, height, name, sha256, width } of CODING_AGENT_MARKS) {
    const codingAgentCard = compatibilitySection.locator(`[data-coding-agent-card="${name}"]`);
    const codingAgentMark = codingAgentCard.locator('[data-coding-agent-mark]');

    await expect(codingAgentCard.getByRole('heading', { name })).toBeVisible();
    await expect(codingAgentMark).toHaveAttribute('src', toPublicPath(assetPath));
    await expect(codingAgentMark).toHaveAttribute('width', String(width));
    await expect(codingAgentMark).toHaveAttribute('height', String(height));

    const assetResponse = await page.request.get(toPublicPath(assetPath));
    expect(assetResponse.ok()).toBe(true);
    expect(
      createHash('sha256')
        .update(await assetResponse.body())
        .digest('hex'),
    ).toBe(sha256);

    const renderedMark = await codingAgentMark.evaluate((image) => {
      const bounds = image.getBoundingClientRect();

      return {
        height: bounds.height,
        objectFit: getComputedStyle(image).objectFit,
        width: bounds.width,
      };
    });
    expect(renderedMark).toStrictEqual({ height: 40, objectFit: 'contain', width: 40 });
  }

  const compatibilityGuideLink = compatibilitySection.getByRole('link', {
    name: 'Read the compatibility guide',
  });
  await expect(compatibilityGuideLink).toHaveAttribute(
    'href',
    toPublicPath('/docs/coding-agent-compatibility/'),
  );

  await compatibilityGuideLink.click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Coding agent compatibility',
    }),
  ).toBeVisible();
});

test('renders source-owned coding agent marks clearly in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.setViewportSize({ height: 1000, width: 1440 });
    await page.goto(toPublicPath('/'));

    const compatibilitySection = page.getByRole('region', {
      name: 'Use the coding agent you already trust.',
    });
    await compatibilitySection.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        compatibilitySection
          .locator('[data-coding-agent-mark]')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    await expect(compatibilitySection).toHaveScreenshot(
      `coding-agent-compatibility-${colorScheme}.png`,
      { animations: 'disabled' },
    );

    await context.close();
  }
});

test('presents the package foundation and links to the packages website', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const packageFoundation = page.getByRole('region', {
    name: 'More than instructions. A tested software foundation.',
  });
  await expect(packageFoundation).toBeVisible();
  await expect(
    packageFoundation.getByRole('heading', { name: 'Verified local execution' }),
  ).toBeVisible();
  await expect(
    packageFoundation.getByRole('heading', { name: 'Deterministic contracts' }),
  ).toBeVisible();
  await expect(
    packageFoundation.getByRole('heading', { name: 'Coherent source evidence' }),
  ).toBeVisible();
  await expect(
    packageFoundation.getByRole('heading', { name: 'Runtime-specific evidence' }),
  ).toBeVisible();

  const packagesLink = packageFoundation.getByRole('link', { name: 'Explore moldea packages' });
  await expect(packagesLink).toHaveAttribute('href', PACKAGES_WEBSITE_URL);
  await expect(packagesLink).toHaveAttribute('target', '_blank');
  await expect(packagesLink).toHaveAttribute('rel', 'noopener noreferrer');
});

test('uses the shared primary action interaction states across public surfaces', async ({
  browser,
}) => {
  const routesWithExpectedActionCounts = [
    ['/', 5],
    ['/404.html', 3],
    ['/search/', 3],
    ['/docs/getting-started/', 3],
  ] as const;

  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();

    for (const [route, expectedActionCount] of routesWithExpectedActionCounts) {
      await page.goto(toPublicPath(route));

      const primaryActions = page.locator('.action-control.action-primary');
      await expect(primaryActions).toHaveCount(expectedActionCount);
    }

    await page.goto(toPublicPath('/'));
    const primaryAction = page.locator('.action-control.action-primary:visible').first();
    const restingBackgroundColor = await primaryAction.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );

    await primaryAction.hover();
    await expect
      .poll(() => primaryAction.evaluate((element) => getComputedStyle(element).backgroundColor))
      .not.toBe(restingBackgroundColor);

    await primaryAction.focus();
    await expect
      .poll(() => primaryAction.evaluate((element) => getComputedStyle(element).boxShadow))
      .not.toBe('none');

    const restingTranslate = await primaryAction.evaluate(
      (element) => getComputedStyle(element).translate,
    );
    await primaryAction.hover();
    await page.mouse.down();
    await expect
      .poll(() => primaryAction.evaluate((element) => getComputedStyle(element).translate))
      .not.toBe(restingTranslate);
    await page.mouse.up();

    await context.close();
  }
});

test('matches the platform search field in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.setViewportSize({ height: 740, width: 720 });
    await page.goto(toPublicPath('/search/'));

    const searchForm = page.getByRole('search');
    const searchInput = page.getByRole('searchbox', { name: 'Search documentation' });
    await expect(searchInput).toHaveClass(/shadow-inset/);
    await expect(searchInput).toHaveClass(/focus-visible:ring-2/);
    await searchInput.focus();

    await expect(searchForm).toHaveScreenshot(`search-field-${colorScheme}.png`, {
      animations: 'disabled',
    });

    await context.close();
  }
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

test('keeps wrapped documentation tables flush with their scroll containers', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const width of [320, 1440]) {
      const context = await browser.newContext({
        colorScheme,
        viewport: { height: 740, width },
      });
      const page = await context.newPage();
      await page.goto(toPublicPath('/docs/how-it-works/'));

      const tableRegion = page.getByRole('region', { name: 'Scrollable table' }).first();
      const tableLayout = await tableRegion.locator('table').evaluate((table) => {
        const tableBounds = table.getBoundingClientRect();
        const wrapperBounds = table.parentElement?.getBoundingClientRect();
        const tableStyles = getComputedStyle(table);

        return {
          bottomGap: wrapperBounds ? wrapperBounds.bottom - tableBounds.bottom : null,
          marginBottom: tableStyles.marginBottom,
          marginTop: tableStyles.marginTop,
          topGap: wrapperBounds ? tableBounds.top - wrapperBounds.top : null,
        };
      });

      expect(tableLayout.marginBottom).toBe('0px');
      expect(tableLayout.marginTop).toBe('0px');
      expect(tableLayout.bottomGap).not.toBeNull();
      expect(tableLayout.topGap).not.toBeNull();
      expect(tableLayout.bottomGap ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
      expect(tableLayout.topGap ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);

      await context.close();
    }
  }
});

test('persists an explicit theme and exposes mobile navigation from the keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  await expect(page.locator('header img[src$="/logo/logo-light.png"]')).toBeVisible();
  await expect(page.locator('header').getByText('skill', { exact: true })).toBeVisible();

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

test('marks the most specific current desktop and mobile navigation destinations', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();

    await page.goto(toPublicPath('/'));
    const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(primaryNavigation.locator('a[aria-current="page"]')).toHaveCount(0);

    await page.goto(toPublicPath('/docs/capabilities/'));
    const activeCapabilitiesLink = primaryNavigation.locator('a[aria-current="page"]');
    const inactiveDocsLink = primaryNavigation.getByRole('link', { name: 'Docs', exact: true });
    await expect(activeCapabilitiesLink).toHaveText('Capabilities');
    expect(
      await activeCapabilitiesLink.evaluate((element) => getComputedStyle(element).backgroundColor),
    ).not.toBe(
      await inactiveDocsLink.evaluate((element) => getComputedStyle(element).backgroundColor),
    );

    await page.goto(toPublicPath('/docs/coding-agent-compatibility/'));
    await expect(primaryNavigation.locator('a[aria-current="page"]')).toHaveText('Docs');

    const navigationMarker = await page.evaluate(() => {
      const marker = crypto.randomUUID();
      (window as Window & { __moldeaNavigationMarker?: string }).__moldeaNavigationMarker = marker;

      return marker;
    });
    await primaryNavigation.getByRole('link', { name: 'Examples', exact: true }).click();
    await page.waitForURL((url) => url.pathname === toPublicPath('/examples/'));
    await expect(primaryNavigation.locator('a[aria-current="page"]')).toHaveText('Examples');
    expect(
      await page.evaluate(
        () => (window as Window & { __moldeaNavigationMarker?: string }).__moldeaNavigationMarker,
      ),
    ).toBe(navigationMarker);

    await page.goto(toPublicPath('/search/'));
    await expect(page.getByRole('link', { name: 'Search documentation' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(primaryNavigation.locator('a[aria-current="page"]')).toHaveCount(0);

    await context.close();
  }

  const mobileContext = await browser.newContext({ colorScheme: 'dark' });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.setViewportSize({ height: 740, width: 320 });
  await mobilePage.goto(toPublicPath('/docs/how-it-works/'));
  await mobilePage.getByLabel('Open navigation').click();

  const mobileNavigation = mobilePage.getByRole('navigation', { name: 'Mobile navigation' });
  const activeMobileLink = mobileNavigation.locator('a[aria-current="page"]');
  const inactiveMobileDocsLink = mobileNavigation.getByRole('link', {
    name: 'Docs',
    exact: true,
  });
  await expect(activeMobileLink).toHaveText('How it works');
  expect(
    await activeMobileLink.evaluate((element) => getComputedStyle(element).backgroundColor),
  ).not.toBe(
    await inactiveMobileDocsLink.evaluate((element) => getComputedStyle(element).backgroundColor),
  );

  await mobileContext.close();
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
