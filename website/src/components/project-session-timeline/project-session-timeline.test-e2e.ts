import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const recordedPath = withBase(
  '/evidence/project-runs/projects/project-2/',
  process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH,
);

for (const width of [320, 768, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`uses shared source overflow in recorded tool dialogs at ${width}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(recordedPath);
      await page.getByRole('button', { name: 'Read exec call 4 and result' }).click();
      const dialog = page.getByRole('dialog', { name: 'exec · event 4' });
      const input = dialog.getByRole('region', { name: 'exec input', exact: true });
      const result = dialog.getByRole('region', { name: 'exec result', exact: true });
      await expect(input).toHaveAttribute('data-code-overflow', 'scroll');
      await expect(result).toHaveAttribute('data-code-overflow', 'wrap');
      expect(await input.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe('pre');
      expect(await result.evaluate((node) => getComputedStyle(node).whiteSpace)).toBe('pre-wrap');
      await input.focus();
      expect(await input.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false);
      expect((await new AxeBuilder({ page }).analyze()).violations).toStrictEqual([]);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(page.getByRole('button', { name: 'Read exec call 4 and result' })).toBeFocused();
    });
  }
}
