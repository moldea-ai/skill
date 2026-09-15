import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('traces the verified 30-day to 14-day maintenance story', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const behaviorAlignment = page.getByRole('region', {
    name: 'Change one rule. See everything it affects.',
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
  await expect(behaviorAlignment.getByText('Refund window updated', { exact: true })).toBeVisible();
  await expect(
    behaviorAlignment.getByText('Linked guidance updated', { exact: true }),
  ).toBeVisible();
  await expect(behaviorAlignment.locator('[data-maintenance-diff="context"]')).toContainText(
    'within 14 completed days',
  );
  await expect(behaviorAlignment.locator('[data-maintenance-diff="instruction"]')).toContainText(
    'within 14 completed days',
  );
  await expect(behaviorAlignment.getByRole('button', { name: /Copy/u })).toHaveCount(0);
  await expect(behaviorAlignment.getByText('Coding agent', { exact: true })).toBeVisible();
  await expect(
    behaviorAlignment.getByText('Coding agent with moldea', { exact: true }),
  ).toHaveCount(0);
  await expect(behaviorAlignment.locator('[data-behavior-agent-mark]')).toBeVisible();
  await expect(behaviorAlignment.locator('[data-behavior-agent-response]')).toContainText(
    'I updated the refund rule and everything connected to it.',
  );

  const conversation = behaviorAlignment.getByRole('list', {
    name: 'Developer and coding agent maintenance conversation',
  });
  await expect(conversation.locator(':scope > li')).toHaveCount(2);
  const [userMessageBounds, agentResponseBounds] = await Promise.all([
    behaviorAlignment.locator('[data-behavior-user-message]').boundingBox(),
    behaviorAlignment.locator('[data-behavior-agent-response]').boundingBox(),
  ]);
  expect(userMessageBounds).not.toBeNull();
  expect(agentResponseBounds).not.toBeNull();
  if (userMessageBounds && agentResponseBounds) {
    expect(agentResponseBounds.y).toBeGreaterThan(userMessageBounds.y + userMessageBounds.height);
  }

  const articleHeights = await behaviorAlignment
    .locator('[data-behavior-alignment-flow] > section')
    .evaluateAll((sections) => sections.map((section) => section.getBoundingClientRect().height));
  expect(articleHeights).toHaveLength(2);
  expect(Math.abs((articleHeights[0] ?? 0) - (articleHeights[1] ?? 0))).toBeLessThan(2);
});

test('stacks the maintenance flow without overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ height: 740, width: 320 });
  await page.goto(toPublicPath('/'));

  const behaviorAlignment = page.getByRole('region', {
    name: 'Change one rule. See everything it affects.',
  });
  const flow = behaviorAlignment.locator('[data-behavior-alignment-flow]');
  const widths = await flow.evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);

  const boundaryResult = behaviorAlignment.locator('[data-behavior-boundary-result]');
  const [boundaryWidths, boundaryBox] = await Promise.all([
    boundaryResult.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    })),
    boundaryResult.boundingBox(),
  ]);
  expect(boundaryWidths.scroll).toBeLessThanOrEqual(boundaryWidths.client);
  expect(boundaryBox).not.toBeNull();
  expect(boundaryBox?.height ?? 0).toBeGreaterThan(24);

  const articleTops = await flow
    .locator(':scope > section')
    .evaluateAll((sections) => sections.map((section) => section.getBoundingClientRect().top));
  expect(articleTops).toHaveLength(2);
  expect(articleTops[1]).toBeGreaterThan(articleTops[0] ?? 0);
});
