import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { LANDING_EXAMPLE } from '../../lib/landing-example/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('shows one verified project journey before optional source detail', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const example = page.getByRole('article', { name: 'Illustrative support agent project' });
  await expect(example).toBeVisible();
  await expect(example.getByText(LANDING_EXAMPLE.request, { exact: true })).toBeVisible();
  await expect(example.getByText('Refunds: within 30 days', { exact: true })).toBeVisible();
  await expect(example.getByText(`Model: ${LANDING_EXAMPLE.model}`, { exact: true })).toBeVisible();
  await expect(example.getByText('Instructions: instruction.md', { exact: true })).toBeVisible();
  await expect(example.getByText('Connections: moldea.yaml', { exact: true })).toBeVisible();
  await expect(example.getByText('Instructions connected.', { exact: true })).toBeVisible();
  await expect(example.locator('[data-code-copy="false"]')).toHaveCount(3);

  const sourceDisclosure = example.locator('details');
  await expect(sourceDisclosure).not.toHaveAttribute('open', '');
  await expect(example.getByText('instructions: loadSupportInstruction()')).toBeHidden();

  await example.getByText('Inspect the files', { exact: true }).click();
  await expect(sourceDisclosure).toHaveAttribute('open', '');
  await expect(example.getByText('instructions: loadSupportInstruction()')).toBeVisible();

  await example.getByRole('tab', { name: 'Connections' }).click();
  await expect(example.getByText('lookup_order', { exact: true })).toBeVisible();
  await expect(example.getByRole('button', { name: /Copy/u })).toHaveCount(0);
});

test('keeps the project journey readable at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const example = page.getByRole('article', { name: 'Illustrative support agent project' });
    const sequence = example.locator('[data-agent-example-sequence]');
    const widths = await example.evaluate((element) => ({
      client: element.clientWidth,
      scroll: element.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);

    const stepPositions = await sequence
      .locator(':scope > li')
      .evaluateAll((steps) => steps.map((step) => Math.round(step.getBoundingClientRect().top)));
    expect(stepPositions).toHaveLength(4);
    expect(stepPositions).toStrictEqual([...stepPositions].sort((left, right) => left - right));
    expect(new Set(stepPositions).size).toBe(4);

    const accessibilityResults = await new AxeBuilder({ page })
      .include('[data-agent-example]')
      .analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);

    await context.close();
  }
});
