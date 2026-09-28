import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';

const toPublicPath = (route: string): string =>
  withBase(route, process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);

test('presents each evidence source as a navigable section', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(toPublicPath('/evidence/'));
  const projectCount =
    loadWebsiteModel().projectRuns?.pages.reduce(
      (count, { attempts }) => count + attempts.length,
      0,
    ) ?? 0;
  const sections = page.locator('[data-evidence-path]');
  await expect(sections).toHaveCount(3);
  const navigation = page.getByRole('navigation', { name: 'Evidence sections' });
  await expect(navigation.getByRole('link')).toHaveCount(3);
  await expect(navigation.getByRole('link', { name: /Decision evaluation/u })).toHaveAttribute(
    'href',
    '#decisions',
  );
  await expect(navigation.getByRole('link', { name: /Adapter qualification/u })).toHaveAttribute(
    'href',
    '#integrations',
  );
  await expect(navigation.getByRole('link', { name: /Project runs/u })).toContainText(
    `${projectCount} project runs`,
  );
  await expect(sections.locator('[data-evidence-path-action]').getByRole('link')).toHaveText([
    'Explore decisions',
    'Explore adapters',
    'Explore project runs',
  ]);
  const boxes = await sections.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }),
  );
  expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y);
  expect(boxes[1]!.y).toBeLessThan(boxes[2]!.y);
  await expect(sections.last().locator('[data-evidence-status]')).toHaveCount(0);
  await expect(
    sections.last().getByRole('link', { name: `View ${projectCount - 3} more project runs` }),
  ).toHaveAttribute('href', toPublicPath('/evidence/project-runs/'));
  for (const section of await sections.all()) {
    const action = section.locator('[data-evidence-path-action]');
    const link = action.getByRole('link');
    const [actionBox, linkBox] = await Promise.all([action.boundingBox(), link.boundingBox()]);
    expect(actionBox).not.toBeNull();
    expect(linkBox).not.toBeNull();
    expect(Math.abs(actionBox!.width - linkBox!.width)).toBeLessThan(2);
  }
});

test('keeps evidence paths readable at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    try {
      const page = await context.newPage();
      await page.goto(toPublicPath('/evidence/'));
      await expect(page.locator('[data-evidence-path]')).toHaveCount(3);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(
        accessibilityResults.violations.filter(
          ({ impact }) => impact === 'critical' || impact === 'serious',
        ),
      ).toStrictEqual([]);
    } finally {
      await context.close();
    }
  }
});
