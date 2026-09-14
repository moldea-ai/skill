import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('answers the coding-agent question with a direct comparison', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const comparison = page.getByRole('region', {
    name: "Can't my coding agent already do this?",
  });
  await expect(comparison).toBeVisible();
  await expect(
    comparison.getByText(
      'Yes. A capable coding agent can inspect your repository, save notes, and write checks.',
      { exact: false },
    ),
  ).toBeVisible();
  await expect(
    comparison.getByRole('heading', { level: 3, name: 'With a coding agent alone' }),
  ).toBeVisible();
  const moldeaHeading = comparison.getByRole('heading', { level: 3, name: 'With moldea' });
  await expect(moldeaHeading.locator('code')).toHaveText('moldea');
  await expect(comparison.locator('[data-why-moldea-comparison] > li')).toHaveCount(3);

  for (const statement of [
    'Reads saved project context that the team reviews in Git.',
    'Reads declared links between instructions, tools, and code.',
    'Runs repeatable software checks for supported relationships.',
  ]) {
    await expect(comparison.getByText(statement, { exact: true })).toBeVisible();
  }

  await expect(comparison.getByRole('link', { name: 'See the evidence' })).toHaveAttribute(
    'href',
    toPublicPath('/evidence/'),
  );
});

test('recomposes the comparison without overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  const comparison = page.getByRole('region', {
    name: "Can't my coding agent already do this?",
  });
  const widths = await comparison.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);

  const firstRowParagraphTops = await comparison
    .locator('[data-why-moldea-comparison] > li')
    .first()
    .locator(':scope > p')
    .evaluateAll((paragraphs) =>
      paragraphs.map((paragraph) => paragraph.getBoundingClientRect().top),
    );
  expect(firstRowParagraphTops).toHaveLength(2);
  expect(firstRowParagraphTops[1]).toBeGreaterThan(firstRowParagraphTops[0] ?? 0);
});
