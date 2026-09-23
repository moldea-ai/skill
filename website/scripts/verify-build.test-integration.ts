// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { createCanonicalUrl, DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { createDocumentationBreadcrumbs } from '../src/lib/documentation-navigation/index.ts';
import { getRepositoryRoot, loadWebsiteModel } from '../src/lib/generation/generation.ts';
import { PRODUCT_PAGE_METADATA, SKILLS_DIRECTORY_URL } from '../src/lib/model/constants.ts';
import {
  getQualificationReleaseEvidenceSummary,
  getSemanticReleaseEvidenceSummary,
} from '../src/lib/release-evidence/index.ts';
import {
  DEFAULT_SITE_URL,
  SITE_ALTERNATE_NAMES,
  SITE_NAME,
  SOCIAL_IMAGE,
} from '../src/lib/site/constants.ts';
import { verifyProductionBuild } from './verify-build.ts';

const getDistPath = (...pathSegments: string[]): string => {
  return join(getRepositoryRoot(), 'website/dist', ...pathSegments);
};

const getTitle = (html: string): string => /<title>([^<]+)<\/title>/u.exec(html)?.[1] ?? '';

// structured breadcrumb fields emitted by the repository-owned layout
interface IStructuredBreadcrumbItem {
  item?: string;
  name: string;
  position: number;
}

/**
 * Reads breadcrumb items from the built JSON-LD output.
 * @param html Generated page HTML.
 * @returns Ordered structured breadcrumb items.
 */
const getStructuredBreadcrumbItems = (html: string): IStructuredBreadcrumbItem[] => {
  const structuredBreadcrumbs = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu),
  ]
    .map(
      (match) =>
        JSON.parse(match[1] ?? '') as {
          '@type'?: string;
          itemListElement?: IStructuredBreadcrumbItem[];
        },
    )
    .find((item) => item['@type'] === 'BreadcrumbList');

  if (structuredBreadcrumbs?.itemListElement === undefined) {
    throw new Error('Structured breadcrumbs are missing from the generated page.');
  }

  return structuredBreadcrumbs.itemListElement;
};

/**
 * Reads the ordered labels from the built visible breadcrumb navigation.
 * @param html Generated page HTML.
 * @returns Ordered visible breadcrumb labels.
 */
const getVisibleBreadcrumbLabels = (html: string): string[] => {
  const breadcrumbNavigation = /<nav aria-label="Breadcrumb"[\s\S]*?<\/nav>/u.exec(html)?.[0];

  if (breadcrumbNavigation === undefined) {
    throw new Error('Visible breadcrumbs are missing from the generated page.');
  }

  return [...breadcrumbNavigation.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gu)].map((match) =>
    (match[1] ?? '')
      .replace(/<svg\b[\s\S]*?<\/svg>/gu, '')
      .replace(/<[^>]+>/gu, '')
      .trim(),
  );
};

describe('verifyProductionBuild', () => {
  test('accepts the complete generated static artifact', () => {
    expect(() => verifyProductionBuild()).not.toThrow();
  });

  test('publishes canonical machine guidance and the primary distribution link', () => {
    const llmsText = readFileSync(getDistPath('llms.txt'), 'utf8');
    const gettingStartedUrl = createCanonicalUrl(
      '/docs/getting-started/',
      process.env['SITE_URL'] ?? DEFAULT_SITE_URL,
      process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH,
    );

    expect(llmsText).toContain('# `moldea` Agent Skill');
    expect(llmsText).toContain(SKILLS_DIRECTORY_URL);
    expect(llmsText).toContain(gettingStartedUrl);
  });

  test('publishes the visual product pages through every discovery surface', () => {
    const siteUrl = process.env['SITE_URL'] ?? DEFAULT_SITE_URL;
    const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
    const llmsText = readFileSync(getDistPath('llms.txt'), 'utf8');
    const sitemap = readFileSync(getDistPath('sitemap-0.xml'), 'utf8');
    const searchRecords = JSON.parse(
      readFileSync(getDistPath('search-index.json'), 'utf8'),
    ) as Array<{ description: string; title: string; url: string }>;

    for (const page of Object.values(PRODUCT_PAGE_METADATA)) {
      const html = readFileSync(getDistPath(page.route.slice(1), 'index.html'), 'utf8');
      const canonicalUrl = createCanonicalUrl(page.route, siteUrl, basePath);

      expect(getTitle(html)).toBe(`${page.title} · ${SITE_NAME}`);
      expect(html).toContain(`<meta name="description" content="${page.description}">`);
      expect(html).toContain(`<link rel="canonical" href="${canonicalUrl}">`);
      expect(sitemap).toContain(canonicalUrl);
      expect(searchRecords.find(({ url }) => url === withBase(page.route, basePath))).toMatchObject(
        {
          description: page.description,
          title: page.title,
          url: withBase(page.route, basePath),
        },
      );
      expect(llmsText).toContain(
        `- [${page.title.replaceAll(/\bmoldea\b/giu, '`moldea`')}](${canonicalUrl}): ${page.description.replaceAll(/\bmoldea\b/giu, '`moldea`')}`,
      );
    }

    const exploreSection = llmsText.split('## Explore\n\n')[1]?.split('\n\n## Start')[0];
    const exploreCopy = exploreSection?.replaceAll(/\]\([^)]+\)/gu, ']');
    expect(exploreSection).toContain('`moldea`');
    expect(exploreCopy?.replaceAll('`moldea`', '')).not.toMatch(/\bmoldea\b/iu);
  });

  test('publishes distinct technical reference identities through discovery surfaces', () => {
    const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
    const model = loadWebsiteModel();
    const llmsText = readFileSync(getDistPath('llms.txt'), 'utf8');
    const searchRecords = JSON.parse(
      readFileSync(getDistPath('search-index.json'), 'utf8'),
    ) as Array<{ title: string; url: string }>;

    for (const reference of [
      { route: '/docs/capabilities/', title: 'Capability reference' },
      { route: '/docs/how-it-works/', title: 'Workflow reference' },
    ] as const) {
      const document = model.documents.find(({ route }) => route === reference.route);
      const html = readFileSync(getDistPath(reference.route.slice(1), 'index.html'), 'utf8');

      expect(document).toMatchObject({
        navigationTitle: reference.title,
        title: reference.title,
      });
      expect(getTitle(html)).toBe(`${reference.title} · ${SITE_NAME}`);
      expect(
        searchRecords.find(({ url }) => url === withBase(reference.route, basePath)),
      ).toMatchObject({
        description: document?.description,
        title: reference.title,
        url: withBase(reference.route, basePath),
      });
      expect(llmsText).toContain(`- [${reference.title}](`);
    }

    expect(llmsText).not.toContain('[Complete capabilities]');
  });

  test('keeps visible and structured documentation breadcrumbs in one hierarchy', () => {
    const siteUrl = process.env['SITE_URL'] ?? DEFAULT_SITE_URL;
    const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
    const model = loadWebsiteModel();

    for (const route of [
      '/docs/',
      '/docs/capabilities/',
      '/examples/',
      '/examples/create-a-support-agent/',
    ]) {
      const document = model.documents.find((candidate) => candidate.route === route);

      if (document === undefined) throw new Error(`Missing documentation model for ${route}.`);

      const html = readFileSync(getDistPath(route.slice(1), 'index.html'), 'utf8');
      const expectedBreadcrumbs = createDocumentationBreadcrumbs(document);
      const expectedLabels = expectedBreadcrumbs.map(({ label }) => label);
      const structuredItems = getStructuredBreadcrumbItems(html);

      expect(getVisibleBreadcrumbLabels(html)).toStrictEqual(expectedLabels);
      expect(structuredItems.map(({ name }) => name)).toStrictEqual(expectedLabels);
      expect(structuredItems.map(({ position }) => position)).toStrictEqual(
        expectedLabels.map((_, index) => index + 1),
      );

      for (const breadcrumb of expectedBreadcrumbs) {
        const href = 'href' in breadcrumb ? breadcrumb.href : undefined;

        if (href === undefined) continue;

        expect(html).toContain(`href="${withBase(href, basePath)}"`);
        expect(structuredItems).toContainEqual(
          expect.objectContaining({
            item: createCanonicalUrl(href, siteUrl, basePath),
            name: breadcrumb.label,
          }),
        );
      }
    }
  });

  test('publishes release semantic evidence while preserving current machine status', () => {
    const siteUrl = process.env['SITE_URL'] ?? DEFAULT_SITE_URL;
    const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
    const model = loadWebsiteModel();
    const homeHtml = readFileSync(getDistPath('index.html'), 'utf8');
    const evidenceHtml = readFileSync(getDistPath('evidence/index.html'), 'utf8');
    const semanticHtml = readFileSync(getDistPath('evidence/semantic/index.html'), 'utf8');
    const llmsText = readFileSync(getDistPath('llms.txt'), 'utf8');
    const sitemap = readFileSync(getDistPath('sitemap-0.xml'), 'utf8');
    const searchRecords = JSON.parse(
      readFileSync(getDistPath('search-index.json'), 'utf8'),
    ) as Array<{
      description: string;
      url: string;
    }>;
    const semanticSearchRecord = searchRecords.find(
      ({ url }) => url === withBase(model.semanticEvaluation.route, basePath),
    );
    const qualificationSummaries = model.qualification.profiles.map(
      getQualificationReleaseEvidenceSummary,
    );
    const qualifiedProfileCount = qualificationSummaries.filter(
      ({ status }) => status === 'passed',
    ).length;
    const currentAssurance = model.currentSemanticAssurance;
    const hasAttemptHistory = model.semanticEvaluation.attempts.length > 0;
    const releaseSummary = getSemanticReleaseEvidenceSummary(
      model.releaseEvidence,
      currentAssurance,
    );
    const successfulCaseCount =
      (releaseSummary.result?.passedCaseCount ?? 0) +
      (releaseSummary.result?.recoveredCaseCount ?? 0);
    expect(model.semanticEvaluation.status).toBe(releaseSummary.result?.status ?? 'not-recorded');
    expect(model.semanticEvaluation.evidenceMatch).toBe(
      model.semanticEvaluation.currentAssurance === null ? null : 'exact',
    );
    expect(homeHtml).toContain(`${successfulCaseCount}/${model.semanticEvaluation.caseCount}`);
    expect(homeHtml).toContain(`${qualifiedProfileCount}/${model.qualification.profiles.length}`);
    expect(homeHtml).toContain(`href="${withBase(model.semanticEvaluation.route, basePath)}"`);
    expect(homeHtml).toContain(`href="${withBase(model.qualification.route, basePath)}"`);
    expect(evidenceHtml).toContain('Follow each result from request to verdict.');
    expect(semanticHtml).toContain(
      `${successfulCaseCount}/${model.semanticEvaluation.caseCount} decisions verified`,
    );
    expect(semanticHtml).toContain(
      releaseSummary.kind === 'not-recorded' ? 'Not recorded' : 'Selected recorded evidence',
    );
    expect(semanticHtml).toContain(
      hasAttemptHistory
        ? model.semanticEvaluation.latest?.result.attemptId
        : releaseSummary.kind === 'recorded'
          ? releaseSummary.result.attemptId
          : 'No semantic attempt has been recorded for this release candidate yet.',
    );
    expect(llmsText).toContain(
      releaseSummary.kind === 'recorded'
        ? `from selected recorded attempt [${releaseSummary.result.attemptId}]`
        : releaseSummary.kind === 'not-recorded'
          ? 'Semantic release evidence: not recorded.'
          : '',
    );
    expect(llmsText).toContain(
      `Semantic release evidence: ${successfulCaseCount}/${model.semanticEvaluation.caseCount} scenarios successful`,
    );
    expect(semanticSearchRecord?.description).toBe(
      `Follow ${model.semanticEvaluation.caseCount} difficult coding-agent decisions from developer request to independent verdict.`,
    );

    for (const route of [
      model.semanticEvaluation.route,
      ...model.semanticEvaluation.attempts.map(({ route }) => route),
    ]) {
      expect(sitemap).toContain(createCanonicalUrl(route, siteUrl, basePath));
    }
  });

  test('publishes one canonical SEO identity and excludes utility routes from discovery', () => {
    const siteUrl = process.env['SITE_URL'] ?? DEFAULT_SITE_URL;
    const basePath = process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH;
    const homeUrl = createCanonicalUrl('/', siteUrl, basePath);
    const socialImageUrl = createCanonicalUrl(SOCIAL_IMAGE.path, siteUrl, basePath);
    const homeHtml = readFileSync(getDistPath('index.html'), 'utf8');
    const searchHtml = readFileSync(getDistPath('search/index.html'), 'utf8');
    const sitemap = readFileSync(getDistPath('sitemap-0.xml'), 'utf8');
    const websiteStructuredData = [
      ...homeHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu),
    ]
      .map((match) => JSON.parse(match[1] ?? '') as Record<string, unknown>)
      .find((item) => item['@type'] === 'WebSite');

    expect(websiteStructuredData).toStrictEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAMES,
      url: homeUrl,
    });
    expect(homeHtml).toContain(`<link rel="canonical" href="${homeUrl}">`);
    expect(homeHtml).toContain(`<meta property="og:image" content="${socialImageUrl}">`);
    expect(homeHtml).toContain(`<meta property="og:image:alt" content="${SOCIAL_IMAGE.alt}">`);
    expect(homeHtml).toContain(`<meta name="twitter:image:alt" content="${SOCIAL_IMAGE.alt}">`);
    expect(searchHtml).toContain('<meta name="robots" content="noindex, follow">');
    expect(searchHtml).not.toContain('rel="canonical"');
    expect(sitemap).not.toContain(createCanonicalUrl('/search/', siteUrl, basePath));
  });

  test('distinguishes conceptual guides from their evidence surfaces', () => {
    const qualificationGuide = readFileSync(
      getDistPath('docs/adapter-qualification/index.html'),
      'utf8',
    );
    const qualificationEvidence = readFileSync(
      getDistPath('evidence/qualification/index.html'),
      'utf8',
    );
    const semanticGuide = readFileSync(getDistPath('docs/semantic-evaluation/index.html'), 'utf8');
    const semanticEvidence = readFileSync(getDistPath('evidence/semantic/index.html'), 'utf8');

    expect(getTitle(qualificationGuide)).not.toBe(getTitle(qualificationEvidence));
    expect(getTitle(semanticGuide)).not.toBe(getTitle(semanticEvidence));
  });
});
