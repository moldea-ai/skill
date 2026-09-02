// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { createCanonicalUrl, DEFAULT_BASE_PATH, withBase } from '@moldea.ai/website-ui/site';

import { getRepositoryRoot, loadWebsiteModel } from '../src/lib/generation/generation.ts';
import { SKILLS_DIRECTORY_URL } from '../src/lib/model/constants.ts';
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

  test('publishes compatible semantic assurance across human and machine surfaces', () => {
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

    expect(model.semanticEvaluation.status).toBe('passed');
    expect(model.semanticEvaluation.evidenceMatch).toBe('compatible');
    expect(model.semanticEvaluation.currentAssurance?.result.attemptId).toBe(
      '20260830T054330932Z-semantic-441e439c',
    );
    expect(homeHtml).toContain('57/57');
    expect(evidenceHtml).toContain('57 of 57 scenarios successful for current assurance');
    expect(semanticHtml).toContain('57/57 scenarios');
    expect(semanticHtml).toContain('Source-attested compatible evidence');
    expect(semanticHtml).not.toContain('No recorded attempt');
    expect(llmsText).toContain('Review the latest passed attempt');
    expect(llmsText).not.toContain('before the first attempt is recorded');
    expect(semanticSearchRecord?.description).toContain('latest passed semantic attempt');

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
