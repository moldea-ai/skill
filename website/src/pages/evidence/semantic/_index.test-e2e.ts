import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type {
  IEvaluationReplayCommandStep,
  IEvaluationReplayWorkspaceStep,
} from '@moldea.ai/website-ui/evaluation-replay-model';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../../lib/generation/generation.ts';
import { getSemanticReleaseEvidenceSummary } from '../../../lib/release-evidence/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('replays semantic release evidence through keyboard-accessible tabs', async ({ page }) => {
  const { currentSemanticAssurance, releaseEvidence, semanticEvaluation } = loadWebsiteModel();
  const releaseSummary = getSemanticReleaseEvidenceSummary(
    releaseEvidence,
    currentSemanticAssurance,
  );
  const successfulCaseCount =
    (releaseSummary.result?.passedCaseCount ?? 0) +
    (releaseSummary.result?.recoveredCaseCount ?? 0);
  await page.goto(toPublicPath('/evidence/semantic/'));

  await expect(page.getByRole('heading', { level: 1, name: 'Semantic evaluation' })).toBeVisible();
  await expect(
    page
      .getByText(`${successfulCaseCount}/${semanticEvaluation.caseCount} decisions verified`, {
        exact: true,
      })
      .first(),
  ).toBeVisible();
  const technicalProvenance = page
    .locator('details')
    .filter({ hasText: 'Technical provenance and raw sources' });
  await technicalProvenance.locator('summary').click();
  await expect(
    technicalProvenance.getByText(
      releaseSummary.kind === 'pinned' ? 'Verified release source' : 'Current release',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'Every trial remains available.',
    }),
  ).toBeVisible();
  const attemptLinks = page.getByRole('link', { name: /Open the complete attempt/u });
  await expect(attemptLinks).toHaveCount(semanticEvaluation.attempts.length);
  await expect(page.getByRole('link', { name: 'How the evaluation works' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/semantic-evaluation/'),
  );
  await expect(page.getByRole('link', { name: 'Inspect the coverage map' })).toHaveAttribute(
    'href',
    /semantic-evaluation-coverage\.json$/u,
  );
  if (releaseSummary.kind === 'pinned') {
    await expect(
      page.getByText(releaseSummary.result.attemptId, { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText('No semantic evaluation has been recorded yet.')).toHaveCount(0);
    await expect(
      technicalProvenance.getByText('Verified release source', { exact: true }),
    ).toBeVisible();
  }

  const presentationAssurance = semanticEvaluation.currentAssurance;
  if (presentationAssurance === null) {
    if (semanticEvaluation.attempts.length === 0) {
      await expect(page.getByText('No semantic evaluation has been recorded yet.')).toBeVisible();
    } else {
      await expect(page.getByText('No semantic evaluation has been recorded yet.')).toHaveCount(0);
      await expect(attemptLinks.first()).toBeVisible();
    }
    return;
  }

  const firstCase = presentationAssurance.cases[0];
  if (firstCase === undefined) throw new Error('Expected one current semantic case.');
  const firstTrial = firstCase.replay?.trials[0];
  if (firstTrial === undefined) throw new Error('Expected one current semantic trial.');
  const commandSteps = firstTrial.steps.filter(
    (step): step is IEvaluationReplayCommandStep => step.kind === 'command',
  );
  if (commandSteps.length === 0) throw new Error('Expected recorded command evidence.');
  const workspaceStep = firstTrial.steps.find(
    (step): step is IEvaluationReplayWorkspaceStep => step.kind === 'workspace',
  );
  if (workspaceStep === undefined) throw new Error('Expected recorded workspace evidence.');
  const replayScenario = page.locator('main details').filter({ hasText: firstCase.title });
  const summary = replayScenario.locator(':scope > summary');
  await summary.focus();
  await summary.press('Enter');
  const replayTab = replayScenario.getByRole('tab', { name: 'Replay' });
  const evidenceTab = replayScenario.getByRole('tab', { name: 'Evidence' });
  await expect(replayTab).toHaveAttribute('aria-selected', 'true');
  await expect(evidenceTab).toHaveAttribute('aria-selected', 'false');
  await expect(replayScenario.getByText('Developer', { exact: true })).toBeVisible();
  await expect(replayScenario.getByText('Coding agent', { exact: true })).toBeVisible();
  for (const commandStep of commandSteps) {
    await expect(
      replayScenario.getByText(commandStep.operation, { exact: true }).first(),
    ).toBeVisible();
  }
  await expect(replayScenario.getByRole('heading', { name: 'Workspace changes' })).toBeVisible();
  const workspaceChangeCount = workspaceStep.groups.reduce(
    (total, group) => total + group.changes.length,
    0,
  );
  if (workspaceChangeCount === 0) {
    await expect(
      replayScenario.getByText('No project-visible files or folders changed.'),
    ).toBeVisible();
  } else {
    await expect(replayScenario.getByRole('heading', { name: 'Created' })).toBeVisible();
    await expect(replayScenario.getByRole('heading', { name: 'Modified' })).toBeVisible();
    await expect(replayScenario.getByRole('heading', { name: 'Deleted' })).toBeVisible();
  }
  const verdict = replayScenario.locator('[data-replay-verdict]').first();
  await expect(verdict.getByText('Trial verdict')).toBeVisible();
  await expect(verdict.getByRole('heading', { name: 'Why it passed' })).toBeHidden();
  await verdict.locator('summary').click();
  await expect(verdict.getByText('Independent judge', { exact: true })).toBeVisible();
  await expect(verdict.getByRole('heading', { name: 'Why it passed' })).toBeVisible();

  await replayTab.focus();
  await replayTab.press('End');
  await expect(evidenceTab).toBeFocused();
  await expect(evidenceTab).toHaveAttribute('aria-selected', 'true');
  await expect(replayScenario.getByRole('heading', { name: 'What had to happen' })).toBeVisible();
  await expect(replayScenario.getByRole('heading', { name: 'What must not happen' })).toBeVisible();
  const evidencePanel = replayScenario.getByRole('tabpanel', { name: 'Evidence' });
  await expect(evidencePanel.getByRole('heading', { name: 'Why it passed' })).toBeVisible();
  await expect(evidencePanel.locator('.replay-markdown')).not.toBeEmpty();
  await expect(evidencePanel.getByText('Evaluated', { exact: false }).last()).toBeVisible();
  await evidenceTab.press('Home');
  await expect(replayTab).toBeFocused();
  await expect(replayTab).toHaveAttribute('aria-selected', 'true');

  await attemptLinks.first().click();
  const attemptScenario = page.locator('main details').filter({ hasText: firstCase.title });
  await attemptScenario.locator(':scope > summary').click();
  await expect(attemptScenario.getByRole('tab', { name: 'Replay' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await attemptScenario.getByRole('tab', { name: 'Evidence' }).click();
  await expect(attemptScenario.getByRole('heading', { name: 'Trial provenance' })).toBeVisible();
  await expect(attemptScenario.getByText('Actor host', { exact: true })).toBeVisible();
  await expect(attemptScenario.getByText('Judge host', { exact: true })).toBeVisible();
});

test('keeps semantic evidence accessible without JavaScript and at 320px', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const noJavaScriptContext = await browser.newContext({
      colorScheme,
      javaScriptEnabled: false,
      viewport: { height: 740, width: 320 },
    });
    const noJavaScriptPage = await noJavaScriptContext.newPage();
    await noJavaScriptPage.goto(toPublicPath('/evidence/semantic/'));

    const firstScenario = noJavaScriptPage.locator('main details').first();
    await firstScenario.locator(':scope > summary').click();
    await expect(firstScenario.locator(':scope > summary')).toBeVisible();
    const widths = await noJavaScriptPage.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    await noJavaScriptContext.close();

    const accessibilityContext = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const accessibilityPage = await accessibilityContext.newPage();
    await accessibilityPage.goto(toPublicPath('/evidence/semantic/'));
    const accessibilityResults = await new AxeBuilder({ page: accessibilityPage }).analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);

    await accessibilityContext.close();
  }
});
