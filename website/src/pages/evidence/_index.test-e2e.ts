import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('presents both evidence types with their current status', async ({ page }) => {
  const { qualification, releaseEvidence, semanticEvaluation } = loadWebsiteModel();
  const semanticReleaseEvidence =
    releaseEvidence.mode === 'recorded' ? releaseEvidence.semantic : null;
  const qualificationReleaseEvidence =
    releaseEvidence.mode === 'recorded' ? releaseEvidence.qualification : null;
  await page.goto(toPublicPath('/evidence/qualification/'));
  const qualificationStatuses = await page
    .getByRole('link', { name: /qualification/iu })
    .locator('[data-evidence-status]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-evidence-status') ?? 'not-recorded'),
    );
  const qualificationStatus = qualificationStatuses.includes('errored')
    ? 'errored'
    : qualificationStatuses.includes('failed')
      ? 'failed'
      : qualificationStatuses.includes('not-recorded')
        ? 'not-recorded'
        : 'passed';
  const qualificationProjectCount = qualification.uniqueJourneyCount;
  const qualificationClaimCount = qualification.profiles.reduce(
    (total, profile) => total + profile.probes.length,
    0,
  );

  await page.goto(toPublicPath('/evidence/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the evidence you need.' }),
  ).toBeVisible();
  const semanticLink = page.getByRole('link', { name: /Semantic evaluation/ });
  const qualificationLink = page.getByRole('link', { name: /Adapter qualification/ });
  await expect(semanticLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    semanticReleaseEvidence?.mode === 'pinned'
      ? 'passed'
      : semanticEvaluation.currentAssurance === null
        ? 'not-recorded'
        : 'passed',
  );
  await expect(semanticLink).toContainText(
    semanticReleaseEvidence?.mode === 'pinned'
      ? `Evidence pinned from ${semanticReleaseEvidence.sourceLabel}`
      : `${semanticEvaluation.passedCaseCount + semanticEvaluation.recoveredCaseCount} of ${semanticEvaluation.caseCount} scenarios successful for current assurance`,
  );
  await expect(qualificationLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    qualificationReleaseEvidence?.mode === 'pinned' ? 'passed' : qualificationStatus,
  );
  await expect(qualificationLink).toContainText(
    qualificationReleaseEvidence?.mode === 'pinned'
      ? `Evidence pinned from ${qualificationReleaseEvidence.sourceLabel}`
      : `${qualificationProjectCount} ${qualificationProjectCount === 1 ? 'project' : 'projects'} covering ${qualificationClaimCount} ${qualificationClaimCount === 1 ? 'claim' : 'claims'}`,
  );
});

test('keeps the evidence overview accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/evidence/'));

    const widths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
    ).toStrictEqual([]);

    await context.close();
  }
});
