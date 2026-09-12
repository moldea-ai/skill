import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('presents both evidence types with their current status', async ({ page }) => {
  const { currentSemanticAssurance, qualification, releaseEvidence, semanticEvaluation } =
    loadWebsiteModel();
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
      : qualificationStatuses.includes('incomplete')
        ? 'incomplete'
        : qualificationStatuses.includes('not-recorded')
          ? 'not-recorded'
          : 'passed';
  const successfulSemanticCaseCount =
    (currentSemanticAssurance?.result.passedCaseCount ?? 0) +
    (currentSemanticAssurance?.result.recoveredCaseCount ?? 0);
  const qualifiedProfileCount = qualification.profiles.filter(
    ({ currentAssurance }) => currentAssurance !== null,
  ).length;

  await page.goto(toPublicPath('/evidence/'));

  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose the evidence you need.' }),
  ).toBeVisible();
  if (releaseEvidence.mode === 'recorded') {
    for (const [kind, section] of [
      ['Semantic', releaseEvidence.semantic],
      ['Qualification', releaseEvidence.qualification],
    ] as const) {
      if (section.mode === 'pinned') {
        await expect(
          page.getByText(
            new RegExp(
              `${kind} release ${releaseEvidence.targetVersion} uses verified prior evidence from`,
              'u',
            ),
          ),
        ).toBeVisible();
      }
    }
  }
  const semanticLink = page.getByRole('link', { name: /Semantic evaluation/ });
  const qualificationLink = page.getByRole('link', { name: /Adapter qualification/ });
  await expect(semanticLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    semanticEvaluation.status,
  );
  await expect(semanticLink).toContainText(
    `${successfulSemanticCaseCount} of ${semanticEvaluation.caseCount} scenarios have current assurance`,
  );
  await expect(qualificationLink.locator('[data-evidence-status]')).toHaveAttribute(
    'data-evidence-status',
    qualificationStatus,
  );
  await expect(qualificationLink).toContainText(
    `${qualifiedProfileCount} of ${qualification.profiles.length} profiles have current assurance`,
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
