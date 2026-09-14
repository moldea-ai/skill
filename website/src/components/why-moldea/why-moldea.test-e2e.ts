import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('stacks the three benefits without a cramped comparison table at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));
  const comparison = page.getByRole('region', { name: "Can't my coding agent already do this?" });
  const benefits = comparison.getByRole('list', { name: 'What moldea adds' }).getByRole('listitem');
  await expect(benefits).toHaveCount(3);
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
