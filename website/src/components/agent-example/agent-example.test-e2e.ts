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
  await expect(example.locator('[data-user-request] code')).toHaveText('support');
  await expect(example.getByText('You', { exact: true })).toBeVisible();
  await expect(example.getByText('Example', { exact: true })).toHaveCount(0);
  await expect(example.getByText('Coding agent', { exact: true })).toBeVisible();
  await expect(
    example.getByText('I created the support agent and connected everything it needs.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(example.locator('[data-agent-message] code')).toHaveText('support');
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
  const userRequestBounds = await example.locator('[data-user-request]').boundingBox();
  expect(userRequestBounds).not.toBeNull();
  expect(userRequestBounds?.height ?? 0).toBeLessThanOrEqual(25);
  if (agentSourceBounds) expect(agentSourceBounds.height).toBeLessThanOrEqual(193);
  const sourceOverflow = await example.locator('[data-agent-source]').evaluate((element) => ({
    client: element.clientHeight,
    scroll: element.scrollHeight,
  }));
  expect(sourceOverflow.scroll).toBeLessThanOrEqual(sourceOverflow.client);
  const codeFileHeaderHeight = await example
    .getByRole('tabpanel', { name: 'Code' })
    .locator('[data-file-preview-header]')
    .evaluate((element) => element.getBoundingClientRect().height);

  const codeTab = example.getByRole('tab', { name: 'Code', exact: true });
  await codeTab.focus();
  await codeTab.press('ArrowRight');
  await expect(example.getByRole('tab', { name: 'Instructions' })).toBeFocused();
  await expect(
    example.getByText(/Explain that refunds are available within 30 completed days/),
  ).toBeVisible();
  await expect(example.getByText('instructions: loadSupportInstruction()')).toBeHidden();
  await example.getByRole('tab', { name: 'Instructions' }).press('ArrowRight');
  await expect(example.getByRole('tab', { name: 'Links' })).toBeFocused();
  await expect(
    example
      .getByRole('region', { name: 'Support agent connections' })
      .getByText('lookup_order', { exact: true }),
  ).toBeVisible();

  const dialogTrigger = example.getByRole('button', {
    name: 'Open the complete connections file in a larger view',
  });
  const connectionsFileHeaderHeight = await dialogTrigger
    .locator('xpath=ancestor::*[@data-file-preview-header][1]')
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(Math.abs(connectionsFileHeaderHeight - codeFileHeaderHeight)).toBeLessThanOrEqual(1);
  const triggerBounds = await dialogTrigger.boundingBox();
  expect(triggerBounds).not.toBeNull();
  expect(triggerBounds?.width).toBe(20);
  expect(triggerBounds?.height).toBe(20);
  await expect(dialogTrigger).toHaveAttribute('title', 'Open connections file');
  await dialogTrigger.click();
  const dialog = example.getByRole('dialog', { name: 'Connections file' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-file-preview]')).toHaveCount(1);
  await expect(dialog.locator('[data-file-preview-header] code')).toHaveText('moldea/moldea.yaml');
  await expect(dialog.getByRole('region', { name: 'Complete connections file' })).toContainText(
    'lookup_order',
  );
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds).not.toBeNull();
  expect(dialogBounds?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(700);
  expect(dialogBounds?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(600);
  await expect(dialog.getByRole('button', { name: /Copy/u })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(dialogTrigger).toBeFocused();

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

      if (name === 'Links') {
        const dialogTrigger = example.getByRole('button', {
          name: 'Open the complete connections file in a larger view',
        });
        await dialogTrigger.click();
        const dialog = example.getByRole('dialog', { name: 'Connections file' });
        await expect(dialog).toBeVisible();
        const dialogBounds = await dialog.boundingBox();
        expect(dialogBounds).not.toBeNull();
        expect(dialogBounds?.width).toBe(320);
        expect(dialogBounds?.height).toBe(740);
        const dialogWidths = await dialog.evaluate((element) => ({
          client: element.clientWidth,
          scroll: element.scrollWidth,
        }));
        expect(dialogWidths.scroll).toBeLessThanOrEqual(dialogWidths.client);
        const dialogAccessibilityResults = await new AxeBuilder({ page })
          .include('#landing-connections-source')
          .analyze();
        expect(
          dialogAccessibilityResults.violations.filter(
            ({ impact }) => impact === 'critical' || impact === 'serious',
          ),
        ).toStrictEqual([]);
        await dialog.getByRole('button', { name: 'Close connections file' }).click();
        await expect(dialog).toBeHidden();
        await expect(dialogTrigger).toBeFocused();
      }
    }
    await context.close();
  }
});

test('keeps the request inside the two-column layout at the laptop breakpoint', async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { height: 800, width: 1024 } });
  const page = await context.newPage();
  await page.goto(toPublicPath('/'));

  const widths = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);

  await context.close();
});
