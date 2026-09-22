import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const route = withBase('/how-it-works/', basePath);
const toPublicPath = (publicRoute: string): string => withBase(publicRoute, basePath);

const PAGE_TITLE_WIDTHS = [320, 639, 640, 1023, 1024, 1279, 1280, 1440] as const;

/** Returns the exact responsive font size owned by Website UI's page-title role. */
const getPageTitleFontSize = (width: number): number => {
  if (width >= 1024) return 60;
  if (width >= 640) return 48;
  return 36;
};

/** Verifies the representative page title after the real bold Ubuntu Sans face has loaded. */
const expectPageTitle = async (
  page: Page,
  heading: Locator,
  nextContent: Locator,
  width: number,
): Promise<void> => {
  await expect(heading).toBeVisible();

  const fontAvailability = await heading.evaluate(async (element) => {
    const text = (element.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
    const fontSize = getComputedStyle(element).fontSize;
    const fontSpecification = `700 ${fontSize} "Ubuntu Sans Variable"`;
    const loadedFontFaces = await document.fonts.load(fontSpecification, text);

    await document.fonts.ready;

    return {
      isAvailable: document.fonts.check(fontSpecification, text),
      loadedFaceCount: loadedFontFaces.length,
    };
  });

  expect(fontAvailability.loadedFaceCount).toBeGreaterThan(0);
  expect(fontAvailability.isAvailable).toBe(true);

  const typography = await heading.evaluate((element) => {
    const computedStyle = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();

    return {
      blockHeight: bounds.height,
      bottom: bounds.bottom,
      clientWidth: element.clientWidth,
      fontFamily: computedStyle.fontFamily,
      fontSize: Number.parseFloat(computedStyle.fontSize),
      fontWeight: computedStyle.fontWeight,
      left: bounds.left,
      letterSpacing: Number.parseFloat(computedStyle.letterSpacing),
      lineHeight: Number.parseFloat(computedStyle.lineHeight),
      overflowX: computedStyle.overflowX,
      overflowY: computedStyle.overflowY,
      overflowWrap: computedStyle.overflowWrap,
      right: bounds.right,
      scrollWidth: element.scrollWidth,
      textWrap: computedStyle.textWrap,
    };
  });
  const expectedFontSize = getPageTitleFontSize(width);

  expect(typography.fontFamily).toContain('Ubuntu Sans Variable');
  expect(typography.fontSize).toBeCloseTo(expectedFontSize, 2);
  expect(typography.fontWeight).toBe('700');
  expect(typography.lineHeight).toBeCloseTo(expectedFontSize * 1.15, 2);
  expect(typography.letterSpacing).toBeCloseTo(expectedFontSize * -0.04, 2);
  expect(typography.textWrap).toBe('balance');
  expect(typography.overflowWrap).toBe('break-word');
  expect(typography.blockHeight).toBeGreaterThan(typography.lineHeight * 1.5);
  expect(['clip', 'hidden']).not.toContain(typography.overflowX);
  expect(['clip', 'hidden']).not.toContain(typography.overflowY);
  expect(typography.scrollWidth).toBeLessThanOrEqual(typography.clientWidth + 1);
  expect(typography.left).toBeGreaterThanOrEqual(-1);
  expect(typography.right).toBeLessThanOrEqual(width + 1);

  const nextContentTop = await nextContent.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(nextContentTop).toBeGreaterThanOrEqual(typography.bottom - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
};

for (const width of PAGE_TITLE_WIDTHS) {
  for (const theme of ['light', 'dark'] as const) {
    test(`keeps the page title legible at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(route);

      const pageTitle = page.getByRole('heading', {
        level: 1,
        name: 'Your request is one sentence. The work stays connected.',
      });

      await expectPageTitle(
        page,
        pageTitle,
        pageTitle.locator('xpath=following-sibling::*[1]'),
        width,
      );
    });
  }
}

test('follows one booking request through five connected stages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Your request is one sentence. The work stays connected.',
    }),
  ).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveCount(0);
  await expect(
    page.getByText(
      'Make our booking assistant offer only available times and send same-day requests to staff.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      'I connected live availability, kept same-day approval in the scheduling service, and checked the complete flow.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('[data-workflow-stage]')).toHaveCount(5);
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }).locator('a[aria-current="page"]'),
  ).toHaveText('How it works');

  const [heroCopyBounds, heroConversationBounds] = await Promise.all([
    page.locator('[data-workflow-hero-copy]').boundingBox(),
    page.locator('[data-workflow-conversation]').boundingBox(),
  ]);
  expect(heroCopyBounds).not.toBeNull();
  expect(heroConversationBounds).not.toBeNull();
  if (heroCopyBounds && heroConversationBounds) {
    expect(heroConversationBounds.width).toBeGreaterThan(heroCopyBounds.width);
  }

  const stageIds = await page
    .locator('[data-workflow-stage]')
    .evaluateAll((stages) => stages.map((stage) => stage.id));
  expect(stageIds).toStrictEqual([
    'project-context',
    'connections',
    'connected-change',
    'verification',
    'next-session',
  ]);
  await expect(page.locator('[data-context-selection]')).toContainText(
    'Same-day requests need staff approval.',
  );
  await expect(page.locator('[data-context-selection] [data-file-preview]')).toHaveCount(0);
  await expect(page.locator('[data-connection-item]')).toHaveCount(4);
  await expect(page.locator('[data-connection-map]')).toContainText(
    'Four affected parts found before the first edit.',
  );
  await expect(page.locator('[data-connected-change]')).toContainText(
    'Each rule keeps one owner. No duplicate prompt policy.',
  );
  await expect(page.locator('[data-connected-change]')).toContainText(
    'The scheduling service enforces the rule. Staff owns the approval decision.',
  );
  await expect(page.locator('[data-verification-row]')).toHaveCount(4);
  await expect(page.locator('[data-verification-row="deterministic"]')).toContainText(
    'Deterministic validation returns the same answer for the same project state.',
  );
  await expect(
    page.getByText('Project memory, available when the next task needs it.'),
  ).toBeVisible();
  await expect(page.locator('[data-later-session-chat] [data-chat-message]')).toHaveCount(2);
  await expect(
    page.locator('[data-later-session-chat]').getByRole('list', {
      name: 'Later booking conversation',
    }),
  ).toContainText('Coding agent');
  await expect(page.locator('[data-code-copy-button]')).toHaveCount(0);

  const plainBrandMentions = await page.locator('body').evaluate((body) => {
    const iterator = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const invalidMentions: string[] = [];
    let currentNode = iterator.nextNode();

    while (currentNode !== null) {
      if (
        /\bmoldea\b/iu.test(currentNode.textContent ?? '') &&
        currentNode.parentElement?.closest('code') === null
      ) {
        invalidMentions.push(currentNode.textContent?.trim() ?? '');
      }
      currentNode = iterator.nextNode();
    }

    return invalidMentions;
  });
  expect(plainBrandMentions).toStrictEqual([]);

  const accessibilityResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityResults.violations).toStrictEqual([]);
});

test('keeps both visual narratives and their technical links available without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto(toPublicPath('/capabilities/'));
  await expect(
    page.getByRole('heading', { level: 1, name: 'From project knowledge to working agents.' }),
  ).toBeVisible();
  await expect(page.locator('[data-capability-section]')).toHaveCount(6);
  await expect(page.getByRole('link', { name: 'Project state guide' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/project-state/'),
  );

  await page.goto(route);
  await expect(page.locator('[data-workflow-stage]')).toHaveCount(5);
  await expect(
    page.getByRole('link', { name: 'Inspect the evidence', exact: true }),
  ).toHaveAttribute('href', toPublicPath('/evidence/'));
  await expect(
    page.getByRole('link', { name: 'Read the technical workflow', exact: true }),
  ).toHaveAttribute('href', toPublicPath('/docs/how-it-works/'));

  await context.close();
});

test('keeps the complete workflow readable at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 900, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(route);

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth, colorScheme).toBeLessThanOrEqual(dimensions.viewportWidth);
    await expect(page.locator('[data-workflow-conversation]')).toBeVisible();
    await expect(page.locator('[data-connection-map]')).toBeVisible();
    await expect(page.locator('[data-verification-board]')).toBeVisible();
    await expect(page.locator('[data-next-session-visual]')).toBeVisible();

    const workflowLink = page.getByRole('link', { name: 'Follow the workflow' });
    await workflowLink.focus();
    await expect(workflowLink).toBeFocused();

    await context.close();
  }
});
