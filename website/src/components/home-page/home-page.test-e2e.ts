import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { PACKAGES_WEBSITE_URL, SKILLS_DIRECTORY_URL } from '../../lib/model/constants.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

test('leads with the durable system around coding-agent work', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Keep agent behavior aligned with the code.',
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Use moldea to give coding agents Git-owned project memory, maintain agent behavior with code, and validate supported repository and runtime relationships.',
  );

  const heroTitleTypography = await page.locator('[data-hero-title]').evaluate((element) => ({
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
  }));
  expect(heroTitleTypography.fontSize).toBeLessThanOrEqual(68);
  expect(heroTitleTypography.lineHeight).toBeGreaterThan(heroTitleTypography.fontSize);

  const durableSystem = page.getByRole('complementary', {
    name: 'The system is still there.',
  });
  await expect(durableSystem).toBeVisible();
  await expect(durableSystem.getByText('Project memory', { exact: true })).toBeVisible();
  await expect(durableSystem.getByText('Behavioral relationships', { exact: true })).toBeVisible();
  await expect(durableSystem.getByText('Mechanical evidence', { exact: true })).toBeVisible();

  const productNameTextTransforms = await page
    .locator('main code')
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.textContent?.trim() === 'moldea')
        .map((element) => getComputedStyle(element).textTransform),
    );
  expect(productNameTextTransforms.length).toBeGreaterThan(0);
  expect(productNameTextTransforms).not.toContain('uppercase');
  await expect(page.locator('.eyebrow code').filter({ hasText: /^moldea$/u })).toHaveCount(3);

  const primaryDistributionLink = page
    .getByRole('link', { name: 'Get moldea on skills.sh', exact: true })
    .first();
  await expect(primaryDistributionLink).toHaveAttribute('href', SKILLS_DIRECTORY_URL);
  await expect(primaryDistributionLink).toHaveAttribute('target', '_blank');
  await expect(primaryDistributionLink).toHaveAttribute('rel', 'noopener noreferrer');

  const alignmentLink = page.getByRole('link', { name: 'See the alignment model', exact: true });
  await expect(alignmentLink).toHaveAttribute('href', '#behavior-alignment');
  await alignmentLink.focus();
  await expect(alignmentLink).toBeFocused();
  await alignmentLink.press('Enter');
  await expect(page).toHaveURL(/#behavior-alignment$/u);
  await expect(
    page.getByRole('heading', {
      level: 2,
      name: 'One change can affect more than one file.',
    }),
  ).toBeVisible();
});

test('presents value and proof before adoption reassurance', async ({ page }) => {
  await page.goto(toPublicPath('/'));

  const orderedHeadings = [
    'Turn coding-agent work into durable project infrastructure.',
    'One install. One ordinary request.',
    'One change can affect more than one file.',
    'The alternative is building this infrastructure yourself.',
    'Start with two files. Add structure only when it earns a home.',
    'We do not ship on confidence alone.',
    'One operating layer across the agent lifecycle.',
    'Use the coding agent you already trust.',
    'Your repository stays yours.',
    'Give your coding agent a system it can keep using.',
  ] as const;
  const headingTops: number[] = [];

  for (const name of orderedHeadings) {
    const heading = page.getByRole('heading', { level: 2, name });
    await expect(heading).toBeVisible();
    headingTops.push(await heading.evaluate((element) => element.getBoundingClientRect().top));
  }

  expect(headingTops).toStrictEqual([...headingTops].sort((left, right) => left - right));

  const sectionHeadingTypography = await page
    .locator('.landing-section-title')
    .evaluateAll((elements) =>
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
  sectionHeadingTypography.forEach(({ fontSize, lineHeight }) => {
    expect(Number.parseFloat(lineHeight)).toBeGreaterThan(Number.parseFloat(fontSize));
  });

  const openingSectionBackgrounds = await page
    .locator(
      '[data-home-hero], [data-why-moldea], [data-getting-started], [data-behavior-alignment], [data-open-source-system]',
    )
    .evaluateAll((sections) =>
      sections.map((section) => getComputedStyle(section).backgroundColor),
    );
  expect(openingSectionBackgrounds).toHaveLength(5);
  openingSectionBackgrounds.slice(1).forEach((backgroundColor, index) => {
    expect(backgroundColor).not.toBe(openingSectionBackgrounds[index]);
  });

  const packagesLink = page.getByRole('link', { name: 'Explore packages' });
  await expect(packagesLink).toHaveAttribute('href', PACKAGES_WEBSITE_URL);
  await expect(page.getByRole('link', { name: 'Review release evidence' })).toHaveAttribute(
    'href',
    toPublicPath('/evidence/'),
  );
  await expect(page.getByRole('link', { name: 'Review the evidence' })).toHaveAttribute(
    'href',
    toPublicPath('/evidence/'),
  );

  const finalDistributionLink = page
    .getByRole('heading', { name: 'Give your coding agent a system it can keep using.' })
    .locator('xpath=ancestor::section[1]')
    .getByRole('link', { name: 'Get moldea on skills.sh' });
  await expect(finalDistributionLink).toHaveAttribute('href', SKILLS_DIRECTORY_URL);
});

test('keeps the complete landing page accessible at 320px in both themes', async ({ browser }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({
      colorScheme,
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
