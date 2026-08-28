import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('replays current semantic evidence through keyboard-accessible tabs', async ({ page }) => {
  await page.goto(toPublicPath('/evidence/semantic/'));

  await expect(page.getByRole('heading', { level: 1, name: 'Semantic evaluation' })).toBeVisible();
  await expect(page.getByText('54/54 scenarios', { exact: true })).toBeVisible();
  await expect(page.getByText('Passed', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Every recorded outcome remains available.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Inspect attempt/u })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Read the methodology' })).toHaveAttribute(
    'href',
    toPublicPath('/docs/semantic-evaluation/'),
  );
  await expect(page.getByRole('link', { name: 'Inspect coverage map' })).toHaveAttribute(
    'href',
    /semantic-evaluation-coverage\.json$/u,
  );
  const replayScenario = page
    .locator('main details')
    .filter({ hasText: 'Initializes from sufficient evidence' });
  const summary = replayScenario.locator(':scope > summary');
  await summary.focus();
  await summary.press('Enter');
  const replayTab = replayScenario.getByRole('tab', { name: 'Replay' });
  const evidenceTab = replayScenario.getByRole('tab', { name: 'Evidence' });
  await expect(replayTab).toHaveAttribute('aria-selected', 'true');
  await expect(evidenceTab).toHaveAttribute('aria-selected', 'false');
  await expect(replayScenario.getByText('Initialize moldea for this repository.')).toBeVisible();
  await expect(replayScenario.getByText('Developer', { exact: true })).toBeVisible();
  await expect(replayScenario.getByText('Coding agent', { exact: true })).toBeVisible();
  await expect(replayScenario.getByText('Normalized recorded operation').first()).toBeVisible();
  await expect(replayScenario.getByText(/^\d+ completed commands?$/u).first()).toBeVisible();
  await expect(replayScenario.getByRole('heading', { name: 'Created' })).toBeVisible();
  await expect(replayScenario.getByRole('heading', { name: 'Modified' })).toBeVisible();
  await expect(replayScenario.getByRole('heading', { name: 'Deleted' })).toBeVisible();
  await expect(replayScenario.getByText('README.md', { exact: true })).toBeVisible();
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
  await expect(replayScenario.getByRole('heading', { name: 'Why it passed' })).toBeHidden();
  await evidenceTab.press('Home');
  await expect(replayTab).toBeFocused();
  await expect(replayTab).toHaveAttribute('aria-selected', 'true');

  const unchangedScenario = page
    .locator('main details')
    .filter({ hasText: 'Evaluates a dirty working tree without editing it' });
  await unchangedScenario.locator(':scope > summary').click();
  await expect(
    unchangedScenario.getByText('No project-visible files or folders changed.'),
  ).toBeVisible();

  await page.getByRole('link', { name: /Inspect attempt/u }).click();
  const attemptScenario = page
    .locator('main details')
    .filter({ hasText: 'Initializes from sufficient evidence' });
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
    await expect(firstScenario.getByText('Developer', { exact: true })).toBeVisible();
    await firstScenario.locator('[data-replay-verdict]').first().locator('summary').click();
    await expect(firstScenario.getByRole('heading', { name: 'Why it passed' })).toBeVisible();
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
