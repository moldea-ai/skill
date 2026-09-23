import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../src/lib/generation/generation.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('renders current coverage without recorded results', async ({ page }) => {
  const model = loadWebsiteModel();
  const semanticCases = model.semanticEvaluation.groups.flatMap(({ cases }) => cases);

  expect(model.releaseEvidence.mode).toBe('not-recorded');
  expect(model.semanticEvaluation).toMatchObject({
    attempts: [],
    currentAssurance: null,
    failedCaseCount: 0,
    hasAttempt: false,
    passedCaseCount: 0,
    pendingCaseCount: model.semanticEvaluation.caseCount,
    recoveredCaseCount: 0,
    status: 'not-recorded',
  });
  expect(semanticCases).toHaveLength(model.semanticEvaluation.caseCount);
  expect(
    semanticCases.every(
      (semanticCase) =>
        semanticCase.rationale === null &&
        semanticCase.replay === null &&
        semanticCase.status === 'pending' &&
        semanticCase.trials.length === 0,
    ),
  ).toBe(true);
  expect(model.qualification.profiles.length).toBeGreaterThan(0);
  expect(
    model.qualification.profiles.every(
      (profile) =>
        profile.attempts.length === 0 &&
        profile.currentAssurance === null &&
        profile.currentLatest === null &&
        profile.currentStatus === 'not-recorded',
    ),
  ).toBe(true);

  await page.goto(toPublicPath(model.semanticEvaluation.route));
  await expect(page.getByText('No recorded attempt', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(`0/${model.semanticEvaluation.caseCount} decisions verified`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('No semantic evaluation has been recorded yet.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No recorded trials yet.' })).toBeVisible();
  await expect(page.getByText('Selected recorded evidence', { exact: true })).toHaveCount(0);

  const firstSemanticCase = semanticCases[0];
  if (firstSemanticCase === undefined) throw new Error('Expected one current semantic case.');
  const semanticCase = page.locator(`#semantic-case-${firstSemanticCase.id}`);
  await semanticCase.locator(':scope > summary').click();
  await semanticCase.getByRole('tab', { name: 'Evidence' }).click();
  await expect(semanticCase.getByRole('heading', { name: 'Not evaluated yet' })).toBeVisible();
  await expect(semanticCase.getByText('This scenario has not been evaluated yet.')).toBeVisible();
  await expect(
    semanticCase.getByText(
      'This scenario remains pending because the recorded run stopped at an earlier failure.',
    ),
  ).toHaveCount(0);

  await page.goto(toPublicPath(model.qualification.route));
  await expect(page.getByText('No recorded attempt', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review the cases' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Await the evidence' })).toBeVisible();
  await expect(page.getByText(/qualification cases/u).first()).toBeVisible();

  const firstProfile = model.qualification.profiles[0];
  if (firstProfile === undefined) throw new Error('Expected one qualification profile.');
  await page.goto(toPublicPath(firstProfile.route));
  await expect(
    page.getByText('No qualification attempt has been recorded for this profile.'),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Replay' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Project' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Technical' })).toHaveCount(0);
});

test('keeps clean evidence pages accessible at 320px in both themes', async ({ browser }) => {
  const model = loadWebsiteModel();
  const firstProfile = model.qualification.profiles[0];
  if (firstProfile === undefined) throw new Error('Expected one qualification profile.');
  const routes = [model.semanticEvaluation.route, model.qualification.route, firstProfile.route];

  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 900, width: 320 },
    });
    const page = await context.newPage();

    for (const route of routes) {
      await page.goto(toPublicPath(route));
      const accessibilityResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityResults.violations).toStrictEqual([]);
      const widths = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    }

    await context.close();
  }
});
