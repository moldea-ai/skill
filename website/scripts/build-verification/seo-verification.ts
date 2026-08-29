import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { createCanonicalUrl } from '@moldea.ai/website-ui/site';

import { SITE_ALTERNATE_NAMES, SITE_NAME, SOCIAL_IMAGE } from '../../src/lib/site/constants.ts';

import { getLogicalPagePath } from './utilities.ts';

const getTagAttributes = (html: string, tagName: string): string[] => {
  const expression = new RegExp(`<${tagName}\\b([^>]*)>`, 'gu');

  return [...html.matchAll(expression)].map((match) => match[1] ?? '');
};

const getAttribute = (attributes: string, name: string): string | null => {
  const expression = new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'u');

  return expression.exec(attributes)?.[1] ?? null;
};

const getMetaContents = (
  html: string,
  identityName: 'name' | 'property',
  identityValue: string,
): string[] => {
  return getTagAttributes(html, 'meta')
    .filter((attributes) => getAttribute(attributes, identityName) === identityValue)
    .map((attributes) => getAttribute(attributes, 'content') ?? '');
};

const getCanonicalHrefs = (html: string): string[] => {
  return getTagAttributes(html, 'link')
    .filter((attributes) =>
      (getAttribute(attributes, 'rel') ?? '').split(/\s+/u).includes('canonical'),
    )
    .map((attributes) => getAttribute(attributes, 'href') ?? '');
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/** Parses every JSON-LD object from one generated document. */
const parseStructuredData = (html: string, relativeHtmlPath: string): Record<string, unknown>[] => {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gu)]
    .filter((match) => getAttribute(match[1] ?? '', 'type') === 'application/ld+json')
    .flatMap((match): Record<string, unknown>[] => {
      let parsed: unknown;

      try {
        parsed = JSON.parse(match[2] ?? '');
      } catch {
        throw new Error(`${relativeHtmlPath} contains invalid JSON-LD.`);
      }

      const values = Array.isArray(parsed) ? parsed : [parsed];

      if (!values.every(isRecord)) {
        throw new Error(`${relativeHtmlPath} contains a non-object JSON-LD entry.`);
      }

      return values;
    });
};

const requireSingleValue = (values: string[], label: string, relativeHtmlPath: string): string => {
  if (values.length !== 1 || !values[0]) {
    throw new Error(`${relativeHtmlPath} must contain exactly one non-empty ${label}.`);
  }

  return values[0];
};

/**
 * Verifies indexability, canonical identity, social previews, structured data, and sitemap scope.
 * @param distDirectory Generated production artifact root.
 * @param files Complete production artifact file list.
 * @param htmlPaths Generated HTML artifact paths.
 * @param basePath Configured public base path.
 * @param siteUrl Configured public origin.
 */
export const verifySeoMetadata = (
  distDirectory: string,
  files: string[],
  htmlPaths: string[],
  basePath: string,
  siteUrl: string,
): void => {
  const canonicalUrls = new Set<string>();
  const titleOwners = new Map<string, string>();
  const descriptionOwners = new Map<string, string>();
  const expectedSocialImageUrl = createCanonicalUrl(SOCIAL_IMAGE.path, siteUrl, basePath);

  for (const htmlPath of htmlPaths) {
    const html = readFileSync(htmlPath, 'utf8');
    const relativeHtmlPath = relative(distDirectory, htmlPath).replaceAll(sep, '/');
    const logicalPagePath = getLogicalPagePath(distDirectory, htmlPath);
    const title = requireSingleValue(
      [...html.matchAll(/<title>([^<]*)<\/title>/gu)].map((match) => match[1] ?? ''),
      'title',
      relativeHtmlPath,
    );
    const description = requireSingleValue(
      getMetaContents(html, 'name', 'description'),
      'meta description',
      relativeHtmlPath,
    );
    const robotsContents = getMetaContents(html, 'name', 'robots');
    const isNoIndex = robotsContents.some((content) =>
      content
        .toLowerCase()
        .split(/[\s,]+/u)
        .includes('noindex'),
    );
    const canonicalHrefs = getCanonicalHrefs(html);
    const structuredData = parseStructuredData(html, relativeHtmlPath);
    const websiteStructuredData = structuredData.filter((item) => item['@type'] === 'WebSite');

    if ((html.match(/<h1\b/gu) ?? []).length !== 1) {
      throw new Error(`${relativeHtmlPath} must contain exactly one level-one heading.`);
    }
    if (robotsContents.length > 1) {
      throw new Error(`${relativeHtmlPath} contains conflicting robots metadata.`);
    }

    if (logicalPagePath === '/') {
      if (websiteStructuredData.length !== 1) {
        throw new Error('The home page must contain exactly one WebSite JSON-LD entry.');
      }

      const websiteIdentity = websiteStructuredData[0];
      const expectedHomeUrl = createCanonicalUrl('/', siteUrl, basePath);

      if (
        websiteIdentity?.['@context'] !== 'https://schema.org' ||
        websiteIdentity['name'] !== SITE_NAME ||
        websiteIdentity['url'] !== expectedHomeUrl ||
        JSON.stringify(websiteIdentity['alternateName']) !== JSON.stringify(SITE_ALTERNATE_NAMES)
      ) {
        throw new Error('The home page WebSite JSON-LD contradicts the public site identity.');
      }
    } else if (websiteStructuredData.length !== 0) {
      throw new Error(`${relativeHtmlPath} must not redefine the home-page WebSite identity.`);
    }

    for (const breadcrumb of structuredData.filter((item) => item['@type'] === 'BreadcrumbList')) {
      const entries = breadcrumb['itemListElement'];

      if (!Array.isArray(entries) || entries.length < 2 || !entries.every(isRecord)) {
        throw new Error(`${relativeHtmlPath} contains an incomplete BreadcrumbList.`);
      }

      entries.forEach((entry, index) => {
        if (entry['@type'] !== 'ListItem' || entry['position'] !== index + 1 || !entry['name']) {
          throw new Error(`${relativeHtmlPath} contains an invalid breadcrumb entry.`);
        }
      });
    }

    if (isNoIndex) {
      if (canonicalHrefs.length !== 0) {
        throw new Error(`${relativeHtmlPath} must not declare a canonical URL while noindex.`);
      }
      continue;
    }

    const expectedCanonicalUrl = createCanonicalUrl(logicalPagePath, siteUrl, basePath);
    const canonicalUrl = requireSingleValue(canonicalHrefs, 'canonical URL', relativeHtmlPath);

    if (canonicalUrl !== expectedCanonicalUrl) {
      throw new Error(`${relativeHtmlPath} has an incorrect canonical URL ${canonicalUrl}.`);
    }
    if (canonicalUrls.has(canonicalUrl)) {
      throw new Error(`${relativeHtmlPath} duplicates canonical URL ${canonicalUrl}.`);
    }
    canonicalUrls.add(canonicalUrl);

    for (const [label, values, expectedValue] of [
      ['Open Graph type', getMetaContents(html, 'property', 'og:type'), 'website'],
      ['Open Graph site name', getMetaContents(html, 'property', 'og:site_name'), SITE_NAME],
      ['Open Graph locale', getMetaContents(html, 'property', 'og:locale'), 'en_US'],
      ['Open Graph title', getMetaContents(html, 'property', 'og:title'), title],
      ['Open Graph description', getMetaContents(html, 'property', 'og:description'), description],
      ['Open Graph URL', getMetaContents(html, 'property', 'og:url'), canonicalUrl],
      ['Open Graph image', getMetaContents(html, 'property', 'og:image'), expectedSocialImageUrl],
      ['Open Graph image type', getMetaContents(html, 'property', 'og:image:type'), 'image/png'],
      [
        'Open Graph image width',
        getMetaContents(html, 'property', 'og:image:width'),
        String(SOCIAL_IMAGE.width),
      ],
      [
        'Open Graph image height',
        getMetaContents(html, 'property', 'og:image:height'),
        String(SOCIAL_IMAGE.height),
      ],
      ['Open Graph image alt', getMetaContents(html, 'property', 'og:image:alt'), SOCIAL_IMAGE.alt],
      ['Twitter card', getMetaContents(html, 'name', 'twitter:card'), 'summary_large_image'],
      ['Twitter title', getMetaContents(html, 'name', 'twitter:title'), title],
      ['Twitter description', getMetaContents(html, 'name', 'twitter:description'), description],
      ['Twitter image', getMetaContents(html, 'name', 'twitter:image'), expectedSocialImageUrl],
      ['Twitter image alt', getMetaContents(html, 'name', 'twitter:image:alt'), SOCIAL_IMAGE.alt],
    ] as const) {
      if (requireSingleValue([...values], label, relativeHtmlPath) !== expectedValue) {
        throw new Error(`${relativeHtmlPath} has inconsistent ${label}.`);
      }
    }

    const existingTitlePath = titleOwners.get(title);
    const existingDescriptionPath = descriptionOwners.get(description);

    if (existingTitlePath) {
      throw new Error(`${relativeHtmlPath} duplicates the title from ${existingTitlePath}.`);
    }
    if (existingDescriptionPath) {
      throw new Error(
        `${relativeHtmlPath} duplicates the meta description from ${existingDescriptionPath}.`,
      );
    }
    titleOwners.set(title, relativeHtmlPath);
    descriptionOwners.set(description, relativeHtmlPath);
  }

  const sitemapLocations = files
    .filter((path) => /^sitemap-\d+\.xml$/u.test(relative(distDirectory, path)))
    .flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/gu)].map(
        (match) => match[1] ?? '',
      ),
    );

  if (sitemapLocations.length !== new Set(sitemapLocations).size) {
    throw new Error('The sitemap contains duplicate page locations.');
  }
  if (JSON.stringify([...sitemapLocations].sort()) !== JSON.stringify([...canonicalUrls].sort())) {
    throw new Error('The sitemap must contain exactly the canonical indexable page URLs.');
  }

  const robotsText = readFileSync(join(distDirectory, 'robots.txt'), 'utf8');
  const expectedSitemapUrl = createCanonicalUrl('/sitemap-index.xml', siteUrl, basePath);

  if (!robotsText.split('\n').includes(`Sitemap: ${expectedSitemapUrl}`)) {
    throw new Error('robots.txt does not identify the canonical sitemap index.');
  }
};
