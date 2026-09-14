import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('traces the verified 30-day to 14-day maintenance story', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const behaviorAlignment = page.getByRole('region', {
    name: 'Change the rule. Find what follows.',
  });
  await expect(behaviorAlignment).toBeVisible();
  await expect(
    behaviorAlignment.getByText(LANDING_EXAMPLE.maintenanceRequest, { exact: true }),
  ).toBeVisible();

  await expect(behaviorAlignment.locator('[data-maintenance-diff="application"]')).toContainText(
    'completedDays <= 30',
  );
  await expect(behaviorAlignment.locator('[data-maintenance-diff="application"]')).toContainText(
    'completedDays <= 14',
  );
  await expect(behaviorAlignment.getByText('14 days', { exact: true })).toBeVisible();
  await expect(behaviorAlignment.getByText('15 days', { exact: true })).toBeVisible();
  await expect(behaviorAlignment.getByText('Eligible', { exact: true })).toBeVisible();
  await expect(behaviorAlignment.getByText('Outside window', { exact: true })).toBeVisible();
  await expect(behaviorAlignment.locator('[data-maintenance-diff="context"]')).toContainText(
    'within 14 completed days',
  );
  await expect(behaviorAlignment.locator('[data-maintenance-diff="instruction"]')).toContainText(
    'within 14 completed days',
  );
  await expect(behaviorAlignment.getByRole('button', { name: /Copy/u })).toHaveCount(0);
});

test('stacks the maintenance flow without overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  const behaviorAlignment = page.getByRole('region', {
    name: 'Change the rule. Find what follows.',
  });
  const flow = behaviorAlignment.locator('[data-behavior-alignment-flow]');
  const widths = await flow.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);

  const articleTops = await flow
    .locator(':scope > article')
    .evaluateAll((articles) => articles.map((article) => article.getBoundingClientRect().top));
  expect(articleTops).toHaveLength(2);
  expect(articleTops[1]).toBeGreaterThan(articleTops[0] ?? 0);
});
