import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';

const CASE_ID = 'multiple-maintenance-requests';
const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const presentation = loadWebsiteModel().semanticEvaluation.currentAssurance;
const evaluationCase = presentation?.cases.find(({ id }) => id === CASE_ID);
if (
  presentation === null ||
  presentation === undefined ||
  evaluationCase?.replay === null ||
  evaluationCase?.replay === undefined
) {
  throw new Error('Expected the synthetic multi-request replay and confirmations.');
}
const replay = evaluationCase.replay;
const routes = [
  ['release', '/evidence/semantic/'],
  ['attempt', presentation.route],
] as const;

const collectErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
};

const assertVisibleFocus = async (control: Locator): Promise<void> => {
  await expect(control).toBeFocused();
  await expect
    .poll(() =>
      control.evaluate((element) => {
        const style = getComputedStyle(element);
        const outline = style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
        const ring = style.boxShadow
          .replace(/rgba?\([^)]*\)/gu, '')
          .split(',')
          .some((shadow) => Number.parseFloat(shadow.match(/-?[\d.]+px/gu)?.[3] ?? '0') > 0);
        return outline || ring;
      }),
    )
    .toBe(true);
};

const openCase = async (page: Page, route: string): Promise<Locator> => {
  await page.goto(withBase(route, basePath));
  const scenario = page.locator(`#semantic-case-${CASE_ID}`);
  const toggle = scenario.locator(':scope > summary');
  await toggle.focus();
  await toggle.press('Enter');
  await assertVisibleFocus(toggle);
  await expect(scenario).toHaveAttribute('open', '');
  await expect(
    scenario.getByText('Each trial keeps its requests, activity summaries and responses in order.'),
  ).toBeVisible();
  return scenario;
};

const assertReplayOrder = async (scenario: Locator): Promise<void> => {
  for (const trial of replay.trials) {
    const region = scenario.getByRole('region', { name: trial.title, exact: true });
    await expect(region).toBeVisible();
    const steps = region.locator(':scope > ol > li');
    await expect(steps).toHaveCount(trial.steps.length);
    for (const [index, step] of trial.steps.entries()) {
      const item = steps.nth(index);
      if (step.kind === 'message') {
        const label = step.role === 'developer' ? 'Developer' : 'Coding agent';
        await expect(item.getByText(label, { exact: true })).toBeVisible();
        // Markdown delimiters are presentation syntax; the recorded text stays in the replay model.
        await expect(item).toContainText(step.content.replaceAll('`', ''));
      } else if (step.kind === 'command') {
        await expect(item.getByText(step.operation, { exact: true })).toBeVisible();
      } else if (step.kind === 'workspace') {
        await expect(
          item.getByRole('heading', { name: 'Workspace changes', exact: true }),
        ).toBeVisible();
      } else {
        await expect(item.getByText('Trial verdict', { exact: true })).toBeVisible();
      }
    }
    await expect(
      region.getByRole('heading', { name: 'Workspace changes', exact: true }),
    ).toHaveCount(1);
    await expect(region.locator('[data-replay-verdict]')).toHaveCount(1);
    await expect(region.getByRole('heading', { name: 'Modified', exact: true })).toBeVisible();
    await expect(region.getByText('project.md', { exact: true })).toBeVisible();
    const otherTrialLabels = replay.trials
      .filter(({ id }) => id !== trial.id)
      .map(({ title }) => `${title}, response`);
    for (const label of otherTrialLabels) await expect(region).not.toContainText(label);
  }
};

const assertNoOverflowOrDuplicateIds = async (page: Page): Promise<void> => {
  const state = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    return {
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
    };
  });
  expect(state.scroll).toBeLessThanOrEqual(state.width);
  expect(state.duplicateIds).toStrictEqual([]);
};

for (const [routeName, route] of routes) {
  for (const width of [320, 768, 1440]) {
    for (const colorScheme of ['light', 'dark'] as const) {
      test(`${routeName}: ordered requests at ${width}px in ${colorScheme}`, async ({
        page,
      }, testInfo) => {
        const errors = collectErrors(page);
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        const scenario = await openCase(page, route);
        await expect(page.locator('html')).toHaveCSS('color-scheme', colorScheme);
        await assertReplayOrder(scenario);
        await assertNoOverflowOrDuplicateIds(page);
        const replayTab = scenario.getByRole('tab', { name: 'Replay', exact: true });
        const evidenceTab = scenario.getByRole('tab', { name: 'Evidence', exact: true });
        await replayTab.focus();
        await replayTab.press('End');
        await expect(evidenceTab).toBeFocused();
        await expect(evidenceTab).toHaveAttribute('aria-selected', 'true');
        await expect(
          scenario.getByRole('heading', { name: 'Why it recovered', exact: true }),
        ).toBeVisible();
        if (routeName === 'attempt') {
          await expect(scenario.getByText('sequential-requests', { exact: true })).toHaveCount(2);
        }
        await assertVisibleFocus(evidenceTab);
        await evidenceTab.press('Home');
        await expect(replayTab).toBeFocused();
        await expect(replayTab).toHaveAttribute('aria-selected', 'true');
        const verdict = scenario
          .getByRole('region', { name: 'Initial trial', exact: true })
          .locator('[data-replay-verdict]');
        const verdictToggle = verdict.locator('summary');
        await verdictToggle.focus();
        await verdictToggle.press('Enter');
        await expect(verdict).toHaveAttribute('open', '');
        await expect(verdict.getByText('Independent judge', { exact: true })).toBeVisible();
        const accessibility = await new AxeBuilder({ page })
          .include(`#semantic-case-${CASE_ID}`)
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(accessibility.violations).toStrictEqual([]);
        await replayTab.focus();
        await page.screenshot({ path: testInfo.outputPath('cycles.png') });
        expect(errors).toStrictEqual([]);
      });
    }
  }
  test(`${routeName}: all requests remain available without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 320, height: 900 },
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    try {
      const page = await context.newPage();
      const errors = collectErrors(page);
      const scenario = await openCase(page, route);
      await assertReplayOrder(scenario);
      await expect(scenario.getByRole('link', { name: 'Replay', exact: true })).toBeVisible();
      await assertNoOverflowOrDuplicateIds(page);
      expect(errors).toStrictEqual([]);
    } finally {
      await context.close();
    }
  });
}
