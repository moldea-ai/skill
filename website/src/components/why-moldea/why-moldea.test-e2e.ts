import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('stacks the three benefits without a cramped comparison table at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));
  const comparison = page.locator('[data-why-moldea]');
  await expect(
    comparison.getByRole('heading', {
      level: 2,
      name: 'Your coding agent can remember. Your project still needs a system.',
    }),
  ).toBeVisible();
  await expect(
    comparison.getByText("Can't my coding agent already do this?", { exact: true }),
  ).toBeVisible();
  await expect(
    comparison.getByText(
      'moldea keeps reviewed project knowledge in Git, brings relevant context into the task, and checks declared connections to code.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    comparison.getByRole('list', { name: 'What coding agents already do' }).getByRole('listitem'),
  ).toHaveText(['Reads the repository', 'Remembers useful context', 'Builds the requested change']);
  const benefits = comparison
    .getByRole('list', { name: 'What the skill adds' })
    .getByRole('listitem');
  await expect(benefits).toHaveCount(3);
  for (const copy of [
    'Project truth',
    'The project owns the truth',
    'Relevant project rules guide planning and development across supported coding agents.',
    'Explicit connections',
    'Every connection is explicit',
    'Declared relationships connect context to the instructions, code, and tests that need review.',
    'Deterministic checks',
    'Validation does not depend on memory',
    'The same files produce the same result, with evidence the team can inspect.',
  ]) {
    await expect(comparison.getByText(copy, { exact: true })).toBeVisible();
  }
  const tops = await benefits.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().top),
  );
  expect(new Set(tops).size).toBe(3);
  expect(tops).toStrictEqual([...tops].sort((left, right) => left - right));
  const widths = await comparison.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`keeps comparison insets and divider edges consistent in ${colorScheme} mode`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto(toPublicPath('/'));
    const comparison = page.getByRole('region', {
      name: 'Your coding agent can remember. Your project still needs a system.',
    });
    await expect(comparison).toBeVisible();
    await expect(page.locator('html')).toHaveClass(new RegExp(colorScheme));

    for (const width of [320, 639, 640, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await comparison.evaluate((section) => {
        const article = section.querySelector('article');
        const strengths = section.querySelector('ul[aria-label="What coding agents already do"]');
        const additions = section.querySelector('ol[aria-label="What the skill adds"]');
        const additionsHeader = additions?.previousElementSibling;
        if (!article || !strengths || !additions || !additionsHeader) {
          throw new Error('The comparison panes are missing.');
        }
        const measure = (element: Element) => {
          const bounds = element.getBoundingClientRect();
          const styles = getComputedStyle(element);
          return {
            left: bounds.left,
            right: bounds.right,
            padding: [
              styles.paddingTop,
              styles.paddingRight,
              styles.paddingBottom,
              styles.paddingLeft,
            ],
            borderTop: styles.borderTopWidth,
            borderBottom: styles.borderBottomWidth,
          };
        };
        return {
          pageOverflows:
            document.documentElement.scrollWidth > document.documentElement.clientWidth,
          sectionOverflows: section.scrollWidth > section.clientWidth,
          article: measure(article),
          strengths: measure(strengths),
          strengthRows: Array.from(strengths.children).map(measure),
          additionsHeader: measure(additionsHeader),
          additionRows: Array.from(additions.children).map(measure),
        };
      });
      expect(geometry.pageOverflows).toBe(false);
      expect(geometry.sectionOverflows).toBe(false);
      const inset = width < 640 ? 20 : 24;
      for (const panel of [geometry.article, geometry.additionsHeader, ...geometry.additionRows]) {
        expect(panel.padding).toStrictEqual(Array(4).fill(`${inset}px`));
      }
      expect(geometry.strengths.left).toBeCloseTo(geometry.article.left, 1);
      expect(geometry.strengths.right).toBeCloseTo(geometry.article.right, 1);
      expect(geometry.strengths.borderTop).toBe('1px');
      expect(geometry.strengths.borderBottom).toBe('1px');
      for (const row of geometry.strengthRows) {
        expect(row.left).toBeCloseTo(geometry.article.left + inset, 1);
        expect(row.right).toBeCloseTo(geometry.article.right - inset, 1);
      }
      expect(geometry.additionsHeader.borderBottom).toBe('1px');
      for (const row of geometry.additionRows) {
        expect(row.left).toBeCloseTo(geometry.additionsHeader.left, 1);
        expect(row.right).toBeCloseTo(geometry.additionsHeader.right, 1);
      }
      if (process.env['MOLDEA_WHY_UI_REVIEW'] === '1' && testInfo.repeatEachIndex === 0) {
        await comparison.screenshot({
          path: testInfo.outputPath(`why-${colorScheme}-${width}.png`),
        });
      }
    }
    const homeLink = page.getByRole('banner').getByRole('link', { name: 'moldea skill home' });
    await homeLink.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(homeLink).toBeFocused();
    expect(
      await homeLink.evaluate((element) => {
        const styles = getComputedStyle(element);
        return (
          (styles.outlineStyle !== 'none' && parseFloat(styles.outlineWidth) > 0) ||
          styles.boxShadow !== 'none'
        );
      }),
    ).toBe(true);
  });
}
