import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('traces a behavior change across semantic and deterministic responsibilities', async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(toPublicPath('/'));

  const behaviorAlignment = page.getByRole('region', {
    name: 'One change can affect more than one file.',
  });
  await expect(behaviorAlignment).toBeVisible();
  await expect(
    behaviorAlignment.getByText('Add manager approval to refunds over $500.'),
  ).toBeVisible();
  await expect(behaviorAlignment.getByText('Skill guidance')).toBeVisible();
  await expect(behaviorAlignment.getByText('Coding agent', { exact: true })).toBeVisible();

  for (const surface of [
    'Refund policy',
    'Support-agent instruction',
    'Approval tool contract',
    'Schemas',
    'Runtime binding',
    'Implementation',
    'Tests',
    'Directly affected documentation',
  ]) {
    await expect(behaviorAlignment.getByText(surface, { exact: true })).toBeVisible();
  }

  await expect(
    behaviorAlignment.getByRole('heading', { name: 'Verify, then report.' }),
  ).toBeVisible();
  await expect(
    behaviorAlignment.getByText(
      'The final report separates changed surfaces from those reconsidered and intentionally left unchanged.',
      { exact: false },
    ),
  ).toBeVisible();

  const columnHeights = await behaviorAlignment
    .locator('[data-behavior-alignment-column]')
    .evaluateAll((columns) =>
      columns.map((column) => Math.round(column.getBoundingClientRect().height)),
    );
  expect(columnHeights).toHaveLength(2);
  expect(Math.abs((columnHeights[0] ?? 0) - (columnHeights[1] ?? 0))).toBeLessThanOrEqual(1);
});

test('stacks the behavior flow without overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  const behaviorAlignment = page.getByRole('region', {
    name: 'One change can affect more than one file.',
  });
  const flow = behaviorAlignment.locator('[data-behavior-alignment-flow]');
  const flowWidths = await flow.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));

  expect(flowWidths.scroll).toBeLessThanOrEqual(flowWidths.client);
});
