import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows the runtime example immediately and makes its connected files keyboard accessible', async ({
  page,
}) => {
  await page.goto(toPublicPath('/'));
  const example = page.getByRole('article', { name: 'Illustrative support agent project' });
  await expect(example.getByText(LANDING_EXAMPLE.request, { exact: true })).toBeVisible();
  await expect(example.getByText('You', { exact: true })).toBeVisible();
  await expect(example.getByText('Example', { exact: true })).toHaveCount(0);
  await expect(example.getByText('Coding agent', { exact: true })).toBeVisible();
  await expect(example.getByText('Coding agent with moldea', { exact: true })).toHaveCount(0);
  await expect(example.locator('[data-agent-response-mark]')).toBeVisible();
  await expect(example.getByText('instructions: loadSupportInstruction()')).toBeVisible();
  await expect(example.getByText(`'${LANDING_EXAMPLE.model}'`, { exact: true })).toBeVisible();
  await expect(example.getByText('Instructions and order lookup connected.')).toHaveCount(0);
  await expect(example.locator('details')).toHaveCount(0);
  await expect(example.getByRole('button', { name: /Copy/u })).toHaveCount(0);

  const conversation = example.getByRole('list', {
    name: 'Developer and coding agent conversation',
  });
  await expect(conversation.locator(':scope > li')).toHaveCount(2);

  const [exampleBounds, userMessageBounds, agentResponseBounds, agentSourceBounds] =
    await Promise.all([
      example.boundingBox(),
      example.locator('[data-user-message]').boundingBox(),
      example.locator('[data-agent-response]').boundingBox(),
      example.locator('[data-agent-source]').boundingBox(),
    ]);
  expect(exampleBounds).not.toBeNull();
  expect(userMessageBounds).not.toBeNull();
  expect(agentResponseBounds).not.toBeNull();
  expect(agentSourceBounds).not.toBeNull();
  if (exampleBounds && userMessageBounds) {
    expect(userMessageBounds.x).toBeLessThan(exampleBounds.x + exampleBounds.width / 2);
  }
  if (userMessageBounds && agentResponseBounds) {
    expect(agentResponseBounds.y).toBeGreaterThan(userMessageBounds.y + userMessageBounds.height);
  }
  if (agentSourceBounds) {
    expect(agentSourceBounds.height).toBeLessThanOrEqual(177);
  }

  const codeTab = example.getByRole('tab', { name: 'Code', exact: true });
  await codeTab.focus();
  await codeTab.press('ArrowRight');
  await expect(example.getByRole('tab', { name: 'Instructions' })).toBeFocused();
  await expect(
    example.getByText(/Explain that refunds are available within 30 completed days/),
  ).toBeVisible();
  await expect(example.getByText('instructions: loadSupportInstruction()')).toBeHidden();
  await example.getByRole('tab', { name: 'Instructions' }).press('ArrowRight');
  await expect(example.getByText('lookup_order', { exact: true })).toBeVisible();
  await example.getByRole('tab', { name: 'Links' }).press('Home');
  await expect(codeTab).toBeFocused();
  await expect(example.getByText('instructions: loadSupportInstruction()')).toBeVisible();
});

test('keeps every example tab readable at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));
    const example = page.getByRole('article', { name: 'Illustrative support agent project' });
    for (const name of ['Code', 'Instructions', 'Links']) {
      await example.getByRole('tab', { name, exact: true }).click();
      const widths = await example.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      const accessibilityResults = await new AxeBuilder({ page })
        .include('[data-agent-example]')
        .analyze();
      expect(
        accessibilityResults.violations.filter(
          ({ impact }) => impact === 'critical' || impact === 'serious',
        ),
      ).toStrictEqual([]);
    }
    await context.close();
  }
});
