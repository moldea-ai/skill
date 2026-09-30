import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { BOOKING_EXAMPLE, BOOKING_EXAMPLE_BEFORE_FILES } from '../../lib/booking-example/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const route = withBase('/how-it-works/', basePath);
const toPublicPath = (publicRoute: string): string => withBase(publicRoute, basePath);

const PAGE_TITLE_WIDTHS = [320, 639, 640, 1023, 1024, 1279, 1280, 1440] as const;

// expected changes in the illustrated booking project, including the two untouched files
const BOOKING_FILE_STATUSES = {
  service: 'modified',
  availability: 'unchanged',
  instructions: 'modified',
  policy: 'unchanged',
} as const;

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
  expect(typography.blockHeight).toBeGreaterThanOrEqual(typography.lineHeight - 1);
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
        name: 'One request. A connected, working agent.',
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
      name: 'One request. A connected, working agent.',
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
    expect(heroConversationBounds.width / heroCopyBounds.width).toBeCloseTo(1 / 0.9, 2);
  }

  for (const file of Object.values(BOOKING_EXAMPLE.files).filter((file) => file.id !== 'tests')) {
    const status = BOOKING_FILE_STATUSES[file.id];
    const trigger = page.getByRole('button', {
      name: `Open ${file.path}, ${status}`,
      exact: true,
    });
    await expect(trigger).toBeVisible();
    const marker = trigger.getByText('M', { exact: true });
    await expect(marker).toHaveCount(status === 'unchanged' ? 0 : 1);
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
  await expect(page.locator('[data-context-selection] [data-file-preview]')).toHaveCount(2);
  await expect(page.locator('[data-connection-item]')).toHaveCount(4);
  await expect(page.locator('[data-connection-map]')).toContainText(
    'Four affected parts found before the first edit.',
  );
  await expect(page.locator('[data-requested-outcome-agent-mark]')).toHaveAttribute(
    'src',
    toPublicPath('/logo/icon-xs-dark.png'),
  );
  await expect(page.locator('[data-connection-map] .lucide-bot')).toHaveCount(0);
  await expect(page.locator('[data-connected-change] .lucide-bot')).toHaveCount(1);
  await expect(page.locator('[data-connected-change]')).toContainText(
    'Each rule keeps one owner. No duplicate prompt policy.',
  );
  await expect(page.locator('[data-connected-change]')).toContainText(
    'The scheduling service enforces the rule. Staff owns the approval decision.',
  );
  await expect(page.locator('[data-verification-row]')).toHaveCount(3);
  await expect(page.locator('[data-booking-availability]')).toContainText('Availability');
  await expect(page.locator('[data-booking-availability] dl > div')).toHaveText([
    /Today:\s*10:00/u,
    /Tomorrow:\s*14:30/u,
  ]);
  await expect(page.locator('[data-verification-row]')).toHaveText([
    /Today.*11:00.*Not offered/su,
    /Today.*10:00.*Waiting for staff/su,
    /Tomorrow.*14:30.*Booking confirmed/su,
  ]);
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
  await expect(page.locator('[data-booking-path]')).toHaveCount(4);
  await expect(page.locator('[data-booking-file-fallback]')).toHaveCount(4);
  await expect(
    page.locator('[data-booking-file-fallback]').getByText('M', { exact: true }),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-booking-file-fallback]').getByText('A', { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('[data-verification-row]')).toHaveCount(3);
  await expect(
    page.getByRole('link', { name: 'Inspect the evidence', exact: true }),
  ).toHaveAttribute('href', toPublicPath('/evidence/'));
  await expect(
    page.getByRole('link', { name: 'Read the technical workflow', exact: true }),
  ).toHaveAttribute('href', toPublicPath('/docs/how-it-works/'));

  await context.close();
});

test('opens the booking project files with the keyboard and returns focus on mobile', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 900, width: 320 },
    });
    try {
      const page = await context.newPage();
      await page.goto(route);
      for (const file of Object.values(BOOKING_EXAMPLE.files).filter(
        (file) => file.id !== 'tests',
      )) {
        const trigger = page.getByRole('button', {
          name: `Open ${file.path}, ${BOOKING_FILE_STATUSES[file.id]}`,
          exact: true,
        });
        await trigger.focus();
        await expect(trigger).toBeFocused();
        await trigger.press('Enter');
        const dialog = page.getByRole('dialog', { name: file.label, exact: true });
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(file.path.split('/').at(-1)!);
        if (BOOKING_FILE_STATUSES[file.id] === 'modified') {
          const diff = dialog.getByRole('region', { name: `${file.label} changes`, exact: true });
          await expect(diff).toHaveAttribute('data-code-diff', 'unified');
          await expect(diff.locator('[data-diff-line] code').first()).toHaveCSS(
            'white-space',
            file.language === 'markdown' ? 'pre-wrap' : 'pre',
          );
          await expect(diff).not.toContainText('No newline at end of file');
          await expect(diff).not.toContainText('Before');
          await expect(diff).not.toContainText('After');
          const before = await diff
            .locator('[data-diff-line]:not([data-diff-line="added"]) code')
            .allTextContents();
          const after = await diff
            .locator('[data-diff-line]:not([data-diff-line="removed"]) code')
            .allTextContents();
          expect(before.join('\n')).toBe(BOOKING_EXAMPLE_BEFORE_FILES[file.path]!.trimEnd());
          expect(after.join('\n')).toBe(file.source.trimEnd());
          await expect(diff.locator('[data-diff-line="added"]')).not.toHaveCount(0);
        } else if (file.language === 'typescript') {
          await expect(dialog.locator('pre')).toHaveText(file.source);
        } else {
          await expect(dialog.getByRole('heading', { level: 3 })).toBeVisible();
          await expect(dialog).toContainText('staff');
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
        const accessibilityResults = await new AxeBuilder({ page }).analyze();
        expect(accessibilityResults.violations).toStrictEqual([]);
        await dialog.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(trigger).toBeFocused();
      }
    } finally {
      await context.close();
    }
  }
});

test('keeps the file tree compact and the owner previews balanced across viewport sizes', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const tree = page.locator('[data-booking-artifacts]');
      await expect(tree.locator('[data-booking-path]')).toHaveCount(4);
      await expect(tree).toContainText('src/');
      await expect(tree).toContainText('moldea/');
      const treeBounds = await tree.boundingBox();
      expect(treeBounds).not.toBeNull();
      // four file rows and four directory rows remain single-line, with larger mobile targets
      expect(treeBounds!.height).toBeLessThanOrEqual(4 * (width < 640 ? 36 : 28) + 4 * 28 + 1);

      const previews = await page
        .locator('[data-connected-change] [data-file-preview]')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const { top, height } = element.getBoundingClientRect();
            const content = element.lastElementChild!;
            const contentTop = content.getBoundingClientRect().top;
            const firstChildTop = content.firstElementChild!.getBoundingClientRect().top;
            return { top, height, contentInset: firstChildTop - contentTop };
          }),
        );
      expect(previews).toHaveLength(3);
      for (const preview of previews) {
        expect(preview.contentInset).toBeCloseTo(12, 0);
      }
      if (width >= 768) {
        for (const preview of previews) {
          expect(Math.abs(preview.top - previews[0]!.top)).toBeLessThanOrEqual(1);
          expect(Math.abs(preview.height - previews[0]!.height)).toBeLessThanOrEqual(1);
        }
      } else {
        const sectionBottom = await page
          .locator('#connected-change')
          .evaluate((element) => element.getBoundingClientRect().bottom);
        const exampleBottom = await page
          .locator('[data-connected-change]')
          .evaluate((element) => element.getBoundingClientRect().bottom);
        expect(sectionBottom - exampleBottom).toBeLessThanOrEqual(1);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  }
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
