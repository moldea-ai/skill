import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../../lib/generation/generation.ts';
import { LANDING_EXAMPLE_PREVIEW } from '../../lib/landing-example/index.ts';
import {
  CLOUD_WEBSITE_URL,
  PACKAGES_WEBSITE_URL,
  SKILLS_DIRECTORY_URL,
} from '../../lib/model/constants.ts';
import {
  getQualificationReleaseEvidenceSummary,
  getSemanticReleaseEvidenceSummary,
} from '../../lib/release-evidence/index.ts';

const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
const toPublicPath = (route: string): string => withBase(route, basePath);

const HEADING_ROLE_WIDTHS = [320, 639, 640, 1023, 1024, 1279, 1280, 1440] as const;
const HOME_HEADING_ROLE_VALUES = {
  display: { letterSpacing: -0.045, lineHeight: 1.1 },
  section: { letterSpacing: -0.025, lineHeight: 1.2 },
} as const;

type IHomeHeadingRole = keyof typeof HOME_HEADING_ROLE_VALUES;

/** Returns the exact responsive font size owned by a shared Website UI heading role. */
const getHeadingRoleFontSize = (role: IHomeHeadingRole, width: number): number => {
  if (role === 'display') {
    if (width >= 1280) return 72;
    if (width >= 640) return 60;
    return 48;
  }

  if (width >= 1024) return 48;
  if (width >= 640) return 36;
  return 30;
};

/** Verifies a home-page heading role after the real bold Ubuntu Sans face has loaded. */
const expectHeadingRole = async (
  page: Page,
  heading: Locator,
  nextContent: Locator,
  role: IHomeHeadingRole,
  width: number,
): Promise<void> => {
  await expect(heading).toBeVisible();

  const fontAvailability = await heading.evaluate(async (element) => {
    const text = (element.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
    const fontSize = getComputedStyle(element).fontSize;
    const fontSpecification = `700 ${fontSize} "Ubuntu Sans Variable"`;
    const loadedFontFaces = await document.fonts.load(fontSpecification, text);

    await document.fonts.ready;

    return {
      isAvailable: document.fonts.check(fontSpecification, text),
      loadedFaceCount: loadedFontFaces.length,
    };
  });

  expect(fontAvailability.loadedFaceCount).toBeGreaterThan(0);
  expect(fontAvailability.isAvailable).toBe(true);

  const typography = await heading.evaluate((element) => {
    const computedStyle = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();

    return {
      blockHeight: bounds.height,
      bottom: bounds.bottom,
      clientWidth: element.clientWidth,
      fontFamily: computedStyle.fontFamily,
      fontSize: Number.parseFloat(computedStyle.fontSize),
      fontWeight: computedStyle.fontWeight,
      left: bounds.left,
      letterSpacing: Number.parseFloat(computedStyle.letterSpacing),
      lineHeight: Number.parseFloat(computedStyle.lineHeight),
      overflowX: computedStyle.overflowX,
      overflowY: computedStyle.overflowY,
      overflowWrap: computedStyle.overflowWrap,
      right: bounds.right,
      scrollWidth: element.scrollWidth,
      textWrap: computedStyle.textWrap,
    };
  });
  const expectedFontSize = getHeadingRoleFontSize(role, width);
  const expectedValues = HOME_HEADING_ROLE_VALUES[role];

  expect(typography.fontFamily).toContain('Ubuntu Sans Variable');
  expect(typography.fontSize).toBeCloseTo(expectedFontSize, 2);
  expect(typography.fontWeight).toBe('700');
  expect(typography.lineHeight).toBeCloseTo(expectedFontSize * expectedValues.lineHeight, 2);
  expect(typography.letterSpacing).toBeCloseTo(expectedFontSize * expectedValues.letterSpacing, 2);
  expect(typography.textWrap).toBe('balance');
  expect(typography.overflowWrap).toBe('break-word');
  expect(typography.blockHeight).toBeGreaterThan(typography.lineHeight * 1.5);
  expect(['clip', 'hidden']).not.toContain(typography.overflowX);
  expect(['clip', 'hidden']).not.toContain(typography.overflowY);
  expect(typography.scrollWidth).toBeLessThanOrEqual(typography.clientWidth + 1);
  expect(typography.left).toBeGreaterThanOrEqual(-1);
  expect(typography.right).toBeLessThanOrEqual(width + 1);

  const nextContentTop = await nextContent.evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  expect(nextContentTop).toBeGreaterThanOrEqual(typography.bottom - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    width,
  );
};

for (const width of HEADING_ROLE_WIDTHS) {
  for (const theme of ['light', 'dark'] as const) {
    test(`keeps display and section headings legible at ${width}px in ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ height: 900, width });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(toPublicPath('/'));

      const displayTitle = page.getByRole('heading', {
        level: 1,
        name: 'Your project changes. Your agents should keep up.',
      });
      const sectionTitle = page.getByRole('heading', {
        level: 2,
        name: 'Your coding agent can remember. Your project still needs a system.',
      });

      await expectHeadingRole(
        page,
        displayTitle,
        displayTitle.locator('xpath=following-sibling::*[1]'),
        'display',
        width,
      );
      await expectHeadingRole(
        page,
        sectionTitle,
        page.locator('[data-why-moldea-comparison]'),
        'section',
        width,
      );
    });
  }
}

test('leads with the connected-agent example and direct paths to act or inspect', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(toPublicPath('/'));

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Your project changes. Your agents should keep up.',
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Give coding agents saved project context, visible connections between agent behavior and code, and repeatable software checks.',
  );
  await expect(
    page.getByRole('article', { name: 'Illustrative support agent project' }),
  ).toBeVisible();
  const model = loadWebsiteModel();
  await expect(
    page.getByText(`Agent Skill · v${model.skill.version}`, { exact: true }),
  ).toBeVisible();

  const primaryInstallLink = page
    .locator('[data-home-hero]')
    .getByRole('link', { name: 'Install the skill', exact: true });
  await expect(primaryInstallLink).toHaveAttribute('href', '#getting-started-title');
  await expect(primaryInstallLink.locator('svg.lucide-arrow-down')).toHaveCount(1);
  await primaryInstallLink.focus();
  await primaryInstallLink.press('Enter');
  await expect(page).toHaveURL(/#getting-started-title$/u);
  await expect(
    page.getByRole('heading', { level: 2, name: 'One install. One ordinary request.' }),
  ).toBeVisible();

  const checksLink = page.getByRole('link', { name: 'See what gets checked', exact: true });
  await expect(checksLink).toHaveAttribute('href', '#deterministic-checks');
  await checksLink.focus();
  await checksLink.press('Enter');
  await expect(page).toHaveURL(/#deterministic-checks$/u);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Same project. Same check. Same result.' }),
  ).toBeVisible();

  await expect(page.locator('[data-maintenance-diff="application"]')).toContainText(
    LANDING_EXAMPLE_PREVIEW.policyDiff.source,
  );
  await expect(page.locator('[data-maintenance-diff="tests"]')).toContainText(
    LANDING_EXAMPLE_PREVIEW.testDiff.source,
  );
  await expect(page.locator('[data-maintenance-diff="context"]')).toContainText(
    LANDING_EXAMPLE_PREVIEW.contextDiff.source,
  );
  await expect(page.locator('[data-maintenance-diff="instruction"]')).toContainText(
    LANDING_EXAMPLE_PREVIEW.instructionDiff.source,
  );
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
    {
      level: 2,
      name: 'Your coding agent can remember. Your project still needs a system.',
    },
    { level: 2, name: 'One skill for the complete moldea workflow.' },
    { level: 2, name: 'Change one rule. See everything it affects.' },
    { level: 2, name: 'Same project. Same check. Same result.' },
    { level: 2, name: 'Project context lives beside the code.' },
    { level: 2, name: 'See what was tested.' },
    { level: 2, name: 'One install. One ordinary request.' },
    { level: 3, name: 'Use the coding agent you already trust.' },
  ] as const;
  const headingTops: number[] = [];

  for (const { level, name } of orderedHeadings) {
    const heading = page.getByRole('heading', { level, name });
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
      '[data-home-hero], [data-why-moldea], [data-capabilities-overview], [data-behavior-alignment], [data-open-source-system], [data-repository-format], [data-home-evidence], [data-adoption]',
    )
    .evaluateAll((sections) =>
      sections.map((section) => getComputedStyle(section).backgroundColor),
    );
  expect(productStoryBackgrounds).toHaveLength(8);
  productStoryBackgrounds.slice(1).forEach((backgroundColor, index) => {
    expect(backgroundColor).not.toBe(productStoryBackgrounds[index]);
  });

  const capabilityCardBackgrounds = await page
    .locator('[data-capabilities-overview] li > a')
    .evaluateAll((links) => links.map((link) => getComputedStyle(link).backgroundColor));
  expect(capabilityCardBackgrounds).toHaveLength(6);
  expect(new Set(capabilityCardBackgrounds)).toStrictEqual(new Set(['rgba(0, 0, 0, 0)']));

  await expect(page.getByRole('link', { name: 'Explore adapter packages' })).toHaveAttribute(
    'href',
    PACKAGES_WEBSITE_URL,
  );
  const capabilitiesSection = page.getByRole('region', {
    name: 'One skill for the complete moldea workflow.',
  });
  await expect(capabilitiesSection.getByRole('listitem')).toHaveCount(6);
  const capabilityHeadings = [
    'Establish project truth',
    'Plan agent systems',
    'Create real agents',
    'Build Agent Skills',
    'Keep behavior current',
    'Evaluate and repair',
  ] as const;
  await expect(capabilitiesSection.getByRole('heading', { level: 3 })).toHaveText(
    capabilityHeadings,
  );
  const capabilityDestinations = [
    '/capabilities/#project-truth',
    '/capabilities/#plan-agent-systems',
    '/capabilities/#create-agents',
    '/capabilities/#build-agent-skills',
    '/capabilities/#keep-behavior-current',
    '/capabilities/#evaluate-and-repair',
  ] as const;
  const capabilityCards = capabilitiesSection.getByRole('listitem').getByRole('link');
  for (const [index, destination] of capabilityDestinations.entries()) {
    await expect(capabilityCards.nth(index)).toHaveAttribute('href', toPublicPath(destination));
  }
  await expect(
    capabilitiesSection.getByRole('link', { name: 'Explore every capability' }),
  ).toHaveAttribute('href', toPublicPath('/capabilities/'));
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
    evidenceSection.getByText(`${qualifiedProfileCount}/${qualification.profiles.length}`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(evidenceSection.locator('[data-home-evidence-release-status]')).toHaveCount(0);
  await expect(evidenceSection.locator('[data-home-evidence-result]')).toHaveCount(2);
  await expect(
    evidenceSection.getByRole('list', { name: 'Verified decision behavior' }).getByRole('listitem'),
  ).toHaveText(['Context choices', 'File changes', 'Project boundaries']);
  await expect(
    evidenceSection.getByRole('list', { name: 'Verified adapter behavior' }).getByRole('listitem'),
  ).toHaveText(['Example project builds', 'Runtime connections', 'Deterministic checks']);
  await expect(
    evidenceSection.getByLabel(/runtime adapters represented/u).locator('img'),
  ).toHaveCount(3);

  const evidenceCardHeights = await evidenceSection
    .locator('[data-home-evidence-card]')
    .evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().height));
  expect(evidenceCardHeights).toHaveLength(2);
  expect(Math.abs((evidenceCardHeights[0] ?? 0) - (evidenceCardHeights[1] ?? 0))).toBeLessThan(2);

  const compatibilitySection = page.getByRole('region', {
    name: 'Use the coding agent you already trust.',
  });
  await expect(
    compatibilitySection.getByRole('heading', {
      level: 3,
      name: 'Use the coding agent you already trust.',
    }),
  ).toBeVisible();
  const codingAgents = compatibilitySection.getByRole('list', {
    name: 'Compatible coding agents',
  });
  await expect(codingAgents).toBeVisible();
  await expect(codingAgents.getByRole('listitem')).toHaveCount(6);

  const gettingStartedSection = page.getByRole('region', {
    name: 'One install. One ordinary request.',
  });
  await expect(gettingStartedSection.getByRole('link', { name: 'Get the skill' })).toHaveAttribute(
    'href',
    SKILLS_DIRECTORY_URL,
  );

  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'Cloud' })).toHaveAttribute(
    'href',
    CLOUD_WEBSITE_URL,
  );
  await expect(footer.getByRole('link', { name: 'Packages' })).toHaveAttribute(
    'href',
    PACKAGES_WEBSITE_URL,
  );
  const exploreNavigation = footer.getByRole('navigation', { name: 'Explore' });
  for (const [name, destination] of [
    ['Capabilities', '/capabilities/'],
    ['How it works', '/how-it-works/'],
    ['Evidence', '/evidence/'],
    ['Docs', '/docs/'],
    ['Getting started', '/docs/getting-started/'],
    ['llms.txt', '/llms.txt'],
  ] as const) {
    await expect(exploreNavigation.getByRole('link', { name, exact: true })).toHaveAttribute(
      'href',
      toPublicPath(destination),
    );
  }
  const externalFooterLinks = footer.locator('a[target="_blank"]');
  await expect(externalFooterLinks).toHaveCount(5);
  for (let index = 0; index < (await externalFooterLinks.count()); index += 1) {
    await expect(externalFooterLinks.nth(index).locator('[data-external-link-icon]')).toBeVisible();
  }
  await expect(footer).toHaveCSS('margin-top', '0px');
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

test('keeps selection visible on primary surfaces in light and dark themes', async ({
  browser,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto(toPublicPath('/'));
    const selections = await page.locator('main .bg-primary').evaluateAll((surfaces) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const painter = canvas.getContext('2d');
      if (painter === null) throw new Error('Selection color sampling is unavailable.');
      return surfaces.map((surface) => {
        const background = getComputedStyle(surface).backgroundColor;
        const text = surface.querySelector('p, code') ?? surface;
        painter.clearRect(0, 0, 1, 1);
        painter.fillStyle = background;
        painter.fillRect(0, 0, 1, 1);
        const before = [...painter.getImageData(0, 0, 1, 1).data].slice(0, 3);
        painter.fillStyle = getComputedStyle(text, '::selection').backgroundColor;
        painter.fillRect(0, 0, 1, 1);
        const selected = [...painter.getImageData(0, 0, 1, 1).data].slice(0, 3);
        return {
          label: text.textContent?.trim(),
          difference: Math.max(
            ...selected.map((channel, index) => Math.abs(channel - before[index]!)),
          ),
        };
      });
    });
    expect(selections.length).toBeGreaterThan(0);
    for (const selection of selections) {
      expect(selection.difference, `${colorScheme}: ${selection.label}`).toBeGreaterThan(40);
    }

    const repeatableSelectionContrast = await page
      .locator('[data-deterministic-result]')
      .evaluate((surface) => {
        const text = surface.querySelector('h3');
        if (text === null) throw new Error('Repeatable evidence heading is missing.');
        const selectionStyle = getComputedStyle(text, '::selection');
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const painter = canvas.getContext('2d');
        if (painter === null) throw new Error('Selection color sampling is unavailable.');
        const sample = (color: string): number[] => {
          painter.clearRect(0, 0, 1, 1);
          painter.fillStyle = color;
          painter.fillRect(0, 0, 1, 1);
          return [...painter.getImageData(0, 0, 1, 1).data].slice(0, 3);
        };
        const luminance = (channels: number[]): number => {
          const linearChannels = channels.map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          });
          return (
            0.2126 * linearChannels[0]! + 0.7152 * linearChannels[1]! + 0.0722 * linearChannels[2]!
          );
        };
        const backgroundLuminance = luminance(sample(selectionStyle.backgroundColor));
        const foregroundLuminance = luminance(sample(selectionStyle.color));
        const lightest = Math.max(backgroundLuminance, foregroundLuminance);
        const darkest = Math.min(backgroundLuminance, foregroundLuminance);
        return (lightest + 0.05) / (darkest + 0.05);
      });
    expect(
      repeatableSelectionContrast,
      `${colorScheme}: repeatable evidence selection`,
    ).toBeGreaterThan(4.5);
    await context.close();
  }
});
