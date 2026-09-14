import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';
import { PACKAGES_WEBSITE_URL, SKILLS_DIRECTORY_URL } from '../../lib/model/constants.ts';
import {
  getQualificationReleaseEvidenceSummary,
  getSemanticReleaseEvidenceSummary,
} from '../../lib/release-evidence/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('leads with the connected-agent example and direct paths to act or inspect', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(toPublicPath('/'));

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Build your agent. Keep its pieces connected.',
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Give coding agents saved project context, visible connections between agent behavior and code, and repeatable software checks.',
  );
  await expect(
    page.getByRole('article', { name: 'Illustrative support agent project' }),
  ).toBeVisible();

  const primaryInstallLink = page
    .locator('[data-home-hero]')
    .getByRole('link', { name: 'Install the skill', exact: true });
  await expect(primaryInstallLink).toHaveAttribute('href', '#getting-started-title');
  await primaryInstallLink.focus();
  await primaryInstallLink.press('Enter');
  await expect(page).toHaveURL(/#getting-started-title$/u);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Install. Initialize. Start building.' }),
  ).toBeVisible();

  const checksLink = page.getByRole('link', { name: 'See what gets checked', exact: true });
  await expect(checksLink).toHaveAttribute('href', '#deterministic-checks');
  await checksLink.focus();
  await checksLink.press('Enter');
  await expect(page).toHaveURL(/#deterministic-checks$/u);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Software checks the connections.' }),
  ).toBeVisible();
});

test('presents the product story before proof and adoption', async ({ page }) => {
  const model = loadWebsiteModel();
  const { currentSemanticAssurance, qualification, releaseEvidence, semanticEvaluation } = model;
  const qualifiedProfileCount = qualification.profiles
    .map(getQualificationReleaseEvidenceSummary)
    .filter(({ status }) => status === 'passed').length;
  const semanticReleaseSummary = getSemanticReleaseEvidenceSummary(
    releaseEvidence,
    currentSemanticAssurance,
  );
  await page.goto(toPublicPath('/'));

  const orderedHeadings = [
    "Can't my coding agent already do this?",
    'One change can affect more than one file.',
    'Software checks the connections.',
    'Start with two files. Add structure only when it earns a home.',
    'See what was tested.',
    'Install. Initialize. Start building.',
  ] as const;
  const headingTops: number[] = [];

  for (const name of orderedHeadings) {
    const heading = page.getByRole('heading', { level: 2, name });
    await expect(heading).toBeVisible();
    headingTops.push(await heading.evaluate((element) => element.getBoundingClientRect().top));
  }
  expect(headingTops).toStrictEqual([...headingTops].sort((left, right) => left - right));

  const sectionHeadingTypography = await page.locator('.section-title').evaluateAll((elements) =>
    elements.map((element) => ({
      fontSize: getComputedStyle(element).fontSize,
      letterSpacing: getComputedStyle(element).letterSpacing,
      lineHeight: getComputedStyle(element).lineHeight,
    })),
  );
  expect(sectionHeadingTypography.length).toBeGreaterThan(0);
  expect(
    new Set(sectionHeadingTypography.map((typography) => JSON.stringify(typography))).size,
  ).toBe(1);

  const productStoryBackgrounds = await page
    .locator(
      '[data-home-hero], [data-why-moldea], [data-behavior-alignment], [data-open-source-system], [data-repository-format], [data-home-evidence], [data-adoption]',
    )
    .evaluateAll((sections) =>
      sections.map((section) => getComputedStyle(section).backgroundColor),
    );
  expect(productStoryBackgrounds).toHaveLength(7);
  productStoryBackgrounds.slice(1).forEach((backgroundColor, index) => {
    expect(backgroundColor).not.toBe(productStoryBackgrounds[index]);
  });

  await expect(page.getByRole('link', { name: 'Explore packages' })).toHaveAttribute(
    'href',
    PACKAGES_WEBSITE_URL,
  );
  const evidenceSection = page.getByRole('region', { name: 'See what was tested.' });
  await expect(
    evidenceSection.getByRole('link', { name: 'Inspect the decisions' }),
  ).toHaveAttribute('href', toPublicPath(semanticEvaluation.route));
  await expect(evidenceSection.getByRole('link', { name: 'Inspect the adapters' })).toHaveAttribute(
    'href',
    toPublicPath(qualification.route),
  );
  await expect(
    evidenceSection.getByText(
      `${(semanticReleaseSummary.result?.passedCaseCount ?? 0) + (semanticReleaseSummary.result?.recoveredCaseCount ?? 0)}/${semanticEvaluation.caseCount}`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    evidenceSection.getByText(
      `${semanticReleaseSummary.result?.passedCaseCount ?? 0} passed directly, ${semanticReleaseSummary.result?.recoveredCaseCount ?? 0} confirmed on retry`,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    evidenceSection.getByText(`${qualifiedProfileCount}/${qualification.profiles.length}`, {
      exact: true,
    }),
  ).toBeVisible();

  const evidenceCardHeights = await evidenceSection
    .locator('[data-home-evidence-card]')
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
  expect(evidenceCardHeights).toHaveLength(2);
  expect(Math.abs((evidenceCardHeights[0] ?? 0) - (evidenceCardHeights[1] ?? 0))).toBeLessThan(2);

  const adoptionSection = page.getByRole('region', {
    name: 'Install. Initialize. Start building.',
  });
  await expect(
    adoptionSection.getByRole('heading', {
      level: 3,
      name: 'Use the coding agent you already trust.',
    }),
  ).toBeVisible();
  await expect(adoptionSection.getByRole('link', { name: 'Get the skill' })).toHaveAttribute(
    'href',
    SKILLS_DIRECTORY_URL,
  );
  await expect(
    page.getByRole('heading', { name: 'Give your coding agent a system it can keep using.' }),
  ).toHaveCount(0);
});

test('keeps the complete landing page accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { height: 740, width: 320 },
    });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));

    const documentWidths = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(documentWidths.scroll).toBeLessThanOrEqual(documentWidths.client);

    const accessibilityResults = await new AxeBuilder({ page }).analyze();
    expect(
      accessibilityResults.violations.filter(
        ({ impact }) => impact === 'critical' || impact === 'serious',
      ),
      `The landing page has material accessibility violations in ${colorScheme} mode`,
    ).toStrictEqual([]);

    await context.close();
  }
});
