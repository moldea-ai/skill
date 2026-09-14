// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { createCanonicalUrl, DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

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
    const currentSuccessfulCaseCount =
      (currentAssurance?.result.passedCaseCount ?? 0) +
      (currentAssurance?.result.recoveredCaseCount ?? 0);

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
      releaseSummary.kind === 'pinned'
        ? 'Verified release source'
        : releaseSummary.kind === 'not-recorded'
          ? 'Not recorded'
          : 'Current release',
    );
    expect(semanticHtml).toContain(
      hasAttemptHistory
        ? model.semanticEvaluation.latest?.result.attemptId
        : releaseSummary.kind === 'pinned'
          ? releaseSummary.result.attemptId
          : 'No semantic attempt has been recorded for this release candidate yet.',
    );
    expect(llmsText).toContain(
      releaseSummary.kind === 'pinned'
        ? `from verified source attempt [${releaseSummary.result.attemptId}]`
        : releaseSummary.kind === 'not-recorded'
          ? 'Semantic release evidence: not recorded.'
          : 'scenarios have exact current assurance.',
    );
    expect(llmsText).toContain(
      `Semantic release evidence: ${successfulCaseCount}/${model.semanticEvaluation.caseCount} scenarios successful`,
    );
    expect(llmsText).toContain(
      `Current semantic contract: ${currentSuccessfulCaseCount}/${model.semanticEvaluation.caseCount} scenarios have exact current assurance.`,
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
