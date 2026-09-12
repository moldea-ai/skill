import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';
import {
  getQualificationReleaseEvidenceSummary,
  getSemanticReleaseEvidenceSummary,
} from '../../lib/release-evidence/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('presents both evidence types with their current status', async ({ page }) => {
  const { currentSemanticAssurance, qualification, releaseEvidence, semanticEvaluation } =
    loadWebsiteModel();
  await page.goto(toPublicPath('/evidence/qualification/'));
  const qualificationSummaries = qualification.profiles.map(getQualificationReleaseEvidenceSummary);
  const qualificationStatuses = qualificationSummaries.map(({ status }) => status);
  const qualificationStatus = qualificationStatuses.includes('errored')
    ? 'errored'
    : qualificationStatuses.includes('failed')
      ? 'failed'
      : qualificationStatuses.includes('incomplete')
        ? 'incomplete'
        : qualificationStatuses.includes('not-recorded')
          ? 'not-recorded'
          : 'passed';
  const semanticReleaseSummary = getSemanticReleaseEvidenceSummary(
    releaseEvidence,
    currentSemanticAssurance,
  );
  const successfulSemanticCaseCount =
    (semanticReleaseSummary.result?.passedCaseCount ?? 0) +
    (semanticReleaseSummary.result?.recoveredCaseCount ?? 0);
  const qualifiedProfileCount = qualificationSummaries.filter(
    ({ status }) => status === 'passed',
  ).length;

  await page.goto(toPublicPath('/evidence/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Proof you can follow, not just a score.' }),
  ).toBeVisible();
  await expect(page.getByText('Safe decision verified', { exact: true })).toBeVisible();
  await expect(page.getByText('Project journey verified', { exact: true })).toBeVisible();
  const semanticLink = page.getByRole('link', { name: /Semantic evaluation/ });
  const qualificationLink = page.getByRole('link', { name: /Adapter qualification/ });
  await expect(semanticLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    semanticReleaseSummary.result?.status ?? 'not-recorded',
  );
  await expect(semanticLink).toContainText(
    `${successfulSemanticCaseCount} of ${semanticEvaluation.caseCount} decisions verified`,
  );
  await expect(qualificationLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    qualificationStatus,
  );
  await expect(qualificationLink).toContainText(
    `${qualifiedProfileCount} of ${qualification.profiles.length} integrations verified`,
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
