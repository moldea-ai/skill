import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const homepage = withBase('/', process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);

test.use({ hasTouch: true });

for (const width of [320, 375, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps the SDK grid stable while scripts load at ${width}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      let releaseScripts!: () => void;
      const scriptsReady = new Promise<void>((resolve) => {
        releaseScripts = resolve;
      });
      await page.route('**/*', async (route) => {
        if (route.request().resourceType() === 'script') await scriptsReady;
        await route.continue();
      });
      const list = page.getByRole('list', { name: 'SDK guidance', exact: true });
      const section = page.getByRole('region', {
        name: 'Guidance for the SDK you use.',
        exact: true,
      });
      let initialHeight: number;
      const initialCount = width >= 1280 ? 9 : 3;
      try {
        await page.goto(homepage, { waitUntil: 'commit' });
        await expect(list).toHaveCSS('display', 'grid');
        await expect(list.getByRole('listitem')).toHaveCount(initialCount);
        await page.evaluate(() => document.fonts.ready);
        initialHeight = (await section.boundingBox())!.height;
      } finally {
        releaseScripts();
        await page.waitForLoadState('load');
        await page.unrouteAll({ behavior: 'wait' });
      }
      await expect(list.getByRole('listitem')).toHaveCount(initialCount);
      expect((await section.boundingBox())!.height).toBeCloseTo(initialHeight, 0);
      const loadMore = section.getByRole('button', { name: 'Load more SDKs', exact: true });
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
      const bounds = (await loadMore.boundingBox())!;
      expect(bounds.width).toBeGreaterThanOrEqual(44);
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      await loadMore.click();
      await expect(list.getByRole('listitem')).toHaveCount(35);
      await expect(loadMore).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      ).toBe(true);
    });
  }
}

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`keeps every SDK available in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto(homepage);
      const list = page.getByRole('list', { name: 'SDK guidance', exact: true });
      await expect(list.getByRole('listitem')).toHaveCount(35);
      await expect(page.getByRole('button', { name: 'Load more SDKs' })).toBeHidden();
    });
  }
});
