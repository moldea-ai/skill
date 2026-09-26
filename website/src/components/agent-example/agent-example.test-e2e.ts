import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import {
  getLandingExampleFile,
  LANDING_EXAMPLE,
  LANDING_EXAMPLE_INITIAL_FILES,
} from '../../lib/landing-example/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);
const artifactPaths = {
  'Agent code': LANDING_EXAMPLE.paths.agent,
  Instructions: LANDING_EXAMPLE.paths.instruction,
  'Order lookup': LANDING_EXAMPLE.paths.orderLookup,
  Contracts: LANDING_EXAMPLE.paths.contracts,
  'Refund policy': LANDING_EXAMPLE.paths.policyContext,
  Connections: LANDING_EXAMPLE.paths.manifest,
  'Project context': LANDING_EXAMPLE.paths.project,
  'Agent description': LANDING_EXAMPLE.paths.agentDescription,
};
const modifiedPaths: readonly string[] = [
  LANDING_EXAMPLE.paths.manifest,
  LANDING_EXAMPLE.paths.orderLookup,
];
const unchangedPaths: readonly string[] = [
  LANDING_EXAMPLE.paths.project,
  LANDING_EXAMPLE.paths.policyContext,
];
const getTriggerName = (path: string): string =>
  `Open ${path.slice(1)}, ${unchangedPaths.includes(path) ? 'unchanged' : modifiedPaths.includes(path) ? 'modified' : 'added'}`;

test('shows generated artifacts inside the developer and coding agent conversation', async ({
  page,
}) => {
  await page.goto(toPublicPath('/'));
  const example = page.getByRole('article', { name: 'Illustrative support agent project' });
  await expect(example.getByText(LANDING_EXAMPLE.request, { exact: true })).toBeVisible();
  await expect(example.locator('[data-user-request] code')).toHaveText('support');
  await expect(example.getByText('You', { exact: true })).toBeVisible();
  await expect(example.getByText('Coding agent', { exact: true })).toBeVisible();
  await expect(
    example.getByText('I created the support agent and connected everything it needs.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(example.locator('[data-agent-message] code')).toHaveText('support');
  await expect(example.locator('[data-agent-response-mark]')).toBeVisible();
  await expect(
    example
      .getByRole('list', { name: 'Developer and coding agent conversation' })
      .locator(':scope > li'),
  ).toHaveCount(2);
  const artifacts = example.getByRole('list', { name: 'Support agent file changes' });
  await expect(artifacts.getByRole('button')).toHaveCount(8);
  await expect(example.getByRole('dialog')).toHaveCount(0);
  await expect(example.getByText('Where is order-1042?', { exact: true })).toHaveCount(0);
  const bounds = await artifacts.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.height).toBeLessThanOrEqual(336);

  for (const [name, snippet] of [
    ['Agent code', 'input: JSON.stringify(SupportInput.parse(input))'],
    ['Instructions', 'Use the order lookup for current order details.'],
    ['Order lookup', 'parameters: {'],
    ['Contracts', 'SupportInput = z.strictObject'],
    ['Refund policy', 'Customers may request a refund within 30 completed days of purchase.'],
    ['Connections', 'symbol: loadSupportInstruction'],
    ['Project context', 'Trailside sells hiking and camping gear online.'],
    [
      'Agent description',
      'Helps Trailside customers track outdoor gear orders and understand the return policy.',
    ],
  ] as const) {
    const trigger = artifacts.getByRole('button', {
      name: getTriggerName(artifactPaths[name]),
      exact: true,
    });
    await trigger.focus();
    expect(await trigger.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe(
      'none',
    );
    await trigger.press('Enter');
    const dialog = example.getByRole('dialog', { name, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(snippet);
    const header = dialog.locator('[data-file-preview-header]');
    if (unchangedPaths.includes(artifactPaths[name])) {
      await expect(trigger.getByText(/^[AM]$/u)).toHaveCount(0);
      await expect(header.getByText(/^[AM]$/u)).toHaveCount(0);
    } else {
      await expect(header).toContainText(modifiedPaths.includes(artifactPaths[name]) ? 'M' : 'A');
    }
    await expect(dialog.getByText('Added file', { exact: true })).toHaveCount(0);
    await expect(dialog.getByText('Changes to existing file', { exact: true })).toHaveCount(0);
    await expect(dialog.locator('[data-file-preview]')).toHaveCount(1);
    const preview = dialog.locator('[data-code-block] pre');
    if (await preview.count()) {
      const source = await preview.innerText();
      if (name === 'Connections') {
        expect(source.trimEnd()).toBe(
          getLandingExampleFile(
            LANDING_EXAMPLE_INITIAL_FILES,
            LANDING_EXAMPLE.paths.manifest,
          ).trimEnd(),
        );
      } else {
        expect(source.trimEnd().split('\n').length).toBeLessThanOrEqual(
          name === 'Order lookup' ? 16 : 8,
        );
      }
      expect(source).not.toMatch(/^import |^export type |^@@|^[+-]/mu);
    }
    if (name === 'Contracts') {
      await expect(dialog).toContainText('SupportOutput = z.strictObject');
      await expect(dialog).not.toContainText('LookupOrderInput');
    }
    if (name === 'Order lookup') {
      await expect(dialog).toContainText(
        'export const lookupOrder = async (orderId: string) => ({ ... });',
      );
      await expect(dialog).toContainText("properties: { orderId: { type: 'string' } }");
      await expect(dialog).not.toContainText('Looks up an order in the mock catalog.');
    }
    if (name === 'Project context')
      await expect(dialog).toContainText('It cannot approve refunds or change orders.');
    await expect(dialog.getByRole('button', { name: /Copy/u })).toHaveCount(0);
    if (name === 'Agent code')
      await expect(dialog).toContainText("zodTextFormat(SupportOutput, 'support')");
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`keeps artifacts usable at 320px in the ${colorScheme} theme`, async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));
    const example = page.getByRole('article', { name: 'Illustrative support agent project' });
    const folderColor = await example
      .getByText('moldea/', { exact: true })
      .evaluate((element) => getComputedStyle(element).color);
    for (const path of unchangedPaths) {
      const filenameColor = await example
        .getByRole('button', { name: getTriggerName(path), exact: true })
        .locator('code')
        .evaluate((element) => getComputedStyle(element).color);
      expect(filenameColor).not.toBe(folderColor);
    }
    const dimensions = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
    const overviewAccessibility = await new AxeBuilder({ page })
      .include('[data-agent-example]')
      .analyze();
    expect(
      overviewAccessibility.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);
    for (const [name, path] of Object.entries(artifactPaths)) {
      const trigger = example.getByRole('button', { name: getTriggerName(path), exact: true });
      await trigger.click();
      const dialog = example.getByRole('dialog', { name, exact: true });
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds).toMatchObject({ width: 320, height: 740 });
      const widths = await dialog.evaluate((element) => ({
        client: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
      const accessibility = await new AxeBuilder({ page })
        .include('[data-agent-example]')
        .analyze();
      expect(
        accessibility.violations.filter(
          ({ impact }) => impact === 'critical' || impact === 'serious',
        ),
      ).toStrictEqual([]);
      await dialog.getByRole('button', { name: `Close ${name.toLowerCase()}` }).click();
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
    }
    await context.close();
  });
}

test('keeps the compact example inside the laptop layout', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { height: 800, width: 1024 } });
  const page = await context.newPage();
  await page.goto(toPublicPath('/'));
  const dimensions = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client);
  for (const path of Object.values(artifactPaths))
    await expect(
      page.getByRole('button', { name: getTriggerName(path), exact: true }),
    ).toBeVisible();
  await context.close();
});

test('opens generated files after client navigation to the landing page', async ({ page }) => {
  await page.goto(toPublicPath('/capabilities/'));
  await page.getByRole('link', { name: 'moldea skill home', exact: true }).first().click();
  await page
    .getByRole('button', { name: getTriggerName(LANDING_EXAMPLE.paths.contracts), exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Contracts', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('SupportInput = z.strictObject');
  await expect(dialog).toContainText('SupportOutput = z.strictObject');
});
