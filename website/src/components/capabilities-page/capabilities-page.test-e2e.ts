import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const route = withBase('/capabilities/', basePath);

test('reveals four more examples independently and moves final-button focus to the new content', async ({
  page,
}) => {
  await page.goto(route);
  const sections = page.locator('[data-capability-section]');
  await expect(sections).toHaveCount(6);
  await expect(page.locator('[data-capability-example]')).toHaveCount(24);
  for (const section of await sections.all()) {
    await expect(section.locator('[data-capability-example]')).toHaveCount(4);
    await expect(section.getByRole('status')).toHaveText('4 of 8 examples');
  }
  const first = sections.first();
  const button = first.getByRole('button', {
    name: 'Load 4 more examples: Establish project truth',
  });
  await expect(button).toHaveAttribute('aria-controls', 'project-truth-examples');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(first.locator('[data-capability-example]')).toHaveCount(8);
  await expect(first.getByRole('status')).toHaveText('8 of 8 examples');
  await expect(
    page.getByRole('heading', { name: 'Connect one policy to the code it governs' }),
  ).toBeFocused();
  await expect(button).toBeHidden();
  await expect(sections.nth(1).locator('[data-capability-example]')).toHaveCount(4);
  for (const section of (await sections.all()).slice(1)) {
    await section.getByRole('button', { name: /^Load 4 more examples:/u }).click();
    await expect(section.locator('[data-capability-example]')).toHaveCount(8);
    await expect(section.getByRole('status')).toHaveText('8 of 8 examples');
    await expect(section.locator('[data-capability-load]')).toBeHidden();
  }
  await expect(page.locator('[data-capability-example]')).toHaveCount(48);
  await expect(page.locator('[data-capability-example] [data-code-copy-button]')).toHaveCount(0);
  const ids = await page.locator('[id]').evaluateAll((elements) => elements.map(({ id }) => id));
  expect(new Set(ids).size).toBe(ids.length);
  expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
});

test('reveals only the linked category for direct and subsequent hash navigation', async ({
  page,
}) => {
  await page.goto(`${route}#declare-runtime-variables`);
  await expect(page.locator('#declare-runtime-variables')).toBeVisible();
  await expect(page.locator('#declare-runtime-variables')).toBeFocused();
  await expect(page.locator('#create-agents [data-capability-example]')).toHaveCount(8);
  await expect(page.locator('#project-truth [data-capability-example]')).toHaveCount(4);
  await page.evaluate(() => {
    window.location.hash = 'map-focused-context';
  });
  await expect(page.locator('#map-focused-context')).toBeVisible();
  await expect(page.locator('#map-focused-context')).toBeFocused();
  await expect(page.locator('#project-truth [data-capability-example]')).toHaveCount(8);
  await expect(page.locator('#plan-agent-systems [data-capability-example]')).toHaveCount(4);
  await page.evaluate(() => {
    window.location.hash = '%invalid';
  });
  await expect(page.locator('[data-capability-example]')).toHaveCount(32);
});

test('reinitializes disclosure and its shared dialog after Astro navigation', async ({ page }) => {
  await page.goto(route);
  await page.locator('#project-truth [data-capability-load]').click();
  await page
    .getByLabel('See these capabilities work')
    .getByRole('link', { name: 'How it works', exact: true })
    .click();
  await expect(page).toHaveURL(withBase('/how-it-works/', basePath));
  await page
    .getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Capabilities', exact: true })
    .click();
  await expect(page.locator('[data-capability-example]')).toHaveCount(24);
  await page.locator('#project-truth [data-capability-load]').click();
  await expect(page.locator('#project-truth [data-capability-example]')).toHaveCount(8);
  const trigger = page.getByRole('button', { name: 'About these examples', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Reading the examples', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('suggested requests and illustrative outcomes');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('renders all 48 examples from the same catalog without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  try {
    const page = await context.newPage();
    await page.goto(route);
    await expect(page.locator('[data-capability-example]')).toHaveCount(48);
    await expect(page.getByRole('button', { name: /^Load 4 more examples:/u })).toHaveCount(0);
    await expect(page.locator('#declare-runtime-variables')).toContainText('variableProviders');
    await expect(page.locator('#report-interrupted-resource-limited-repair')).toContainText(
      '8 MiB',
    );
    const dimensions = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  } finally {
    await context.close();
  }
});

for (const width of [320, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps expanded examples accessible at ${width}px in ${colorScheme} with reduced motion`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        colorScheme,
        reducedMotion: 'reduce',
        viewport: { width, height: 900 },
      });
      try {
        const page = await context.newPage();
        await page.goto(route);
        for (const button of await page.locator('[data-capability-load]').all())
          await button.click();
        const dimensions = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
        await page.keyboard.press('Tab');
        const anchor = page.getByRole('link', { name: 'Establish project truth', exact: true });
        await anchor.focus();
        await expect(anchor).toBeFocused();
        const outline = await anchor.evaluate((element) => getComputedStyle(element).outlineStyle);
        expect(outline).not.toBe('none');
        const trigger = page.getByRole('button', { name: 'About these examples', exact: true });
        await trigger.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog', { name: 'Reading the examples' });
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
        expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
      } finally {
        await context.close();
      }
    });
  }
}
