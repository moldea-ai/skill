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
      'Memory can recall useful context. moldea makes the source of truth, relationships, deterministic validation, and evidence part of the repository.',
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
    'Reviewed context stays with the project and can guide every supported coding agent.',
    'Explicit connections',
    'Every connection is explicit',
    'Rules point to the instructions, tools, code, and tests that may need attention.',
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
