import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSearchDocuments } from '@moldea.ai/website-ui/search';
import {
  createCanonicalUrl,
  DEFAULT_BASE_PATH,
  normalizeBasePath,
} from '@moldea.ai/website-ui/site';

import { loadWebsiteModel } from '../src/lib/generation/generation.ts';
import { SKILLS_DIRECTORY_URL } from '../src/lib/model/constants.ts';
import { DEFAULT_SITE_URL } from '../src/lib/site/constants.ts';

import { getLogicalPagePath, verifySeoMetadata } from './build-verification/index.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

const getWebsiteDirectory = (): string => resolve(fileURLToPath(new URL('..', import.meta.url)));

const listFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry): string[] => {
      if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
        throw new Error(`Production artifact contains excluded directory ${entry.name}.`);
      }

      const path = join(directory, entry.name);

      return entry.isDirectory() ? listFiles(path) : [path];
    });
};

const routeToArtifactPath = (distDirectory: string, route: string): string => {
  if (route === '/') return join(distDirectory, 'index.html');
  if (route === '/404.html') return join(distDirectory, '404.html');
  if (route.endsWith('/')) return join(distDirectory, route.slice(1), 'index.html');

  return join(distDirectory, route.slice(1));
};

const getArtifactPathFromPublicUrl = (
  distDirectory: string,
  publicPath: string,
  basePath: string,
): string | null => {
  if (!publicPath.startsWith(basePath)) return null;

  const logicalPath = `/${publicPath.slice(basePath.length)}`.replaceAll(/\/{2,}/g, '/');

  if (logicalPath.endsWith('/')) return routeToArtifactPath(distDirectory, logicalPath);
  if (extname(logicalPath)) return join(distDirectory, logicalPath.slice(1));

  return routeToArtifactPath(distDirectory, `${logicalPath}/`);
};

const getHtmlIdList = (html: string): string[] => {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1] ?? '');
};

const getHtmlIds = (html: string): Set<string> => new Set(getHtmlIdList(html));

const verifyHtmlLinks = (
  distDirectory: string,
  htmlPath: string,
  basePath: string,
  siteUrl: string,
): void => {
  const html = readFileSync(htmlPath, 'utf8');
  const relativeHtmlPath = relative(distDirectory, htmlPath).replaceAll(sep, '/');
  const logicalPagePath = getLogicalPagePath(distDirectory, htmlPath);
  const deployedPageUrl = new URL(createCanonicalUrl(logicalPagePath, siteUrl, basePath));
  const ids = getHtmlIdList(html);
  const seenIds = new Set<string>();

  for (const id of ids) {
    if (seenIds.has(id)) throw new Error(`${relativeHtmlPath} contains duplicate id ${id}.`);
    seenIds.add(id);
  }

  for (const match of html.matchAll(/<a\b([^>]*)>/g)) {
    const attributes = match[1] ?? '';
    const href = /\shref="([^"]+)"/.exec(attributes)?.[1];

    if (!href) continue;

    const url = new URL(href, deployedPageUrl);

    if (!['http:', 'https:'].includes(url.protocol) || url.origin === deployedPageUrl.origin) {
      continue;
    }

    const rel = /\srel="([^"]+)"/.exec(attributes)?.[1]?.split(/\s+/) ?? [];

    if (
      !/\starget="_blank"/.test(attributes) ||
      !rel.includes('noopener') ||
      !rel.includes('noreferrer')
    ) {
      throw new Error(`${relativeHtmlPath} has an external link without safe new-tab behavior.`);
    }
  }

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const target = match[1] ?? '';

    if (
      target.startsWith('mailto:') ||
      target.startsWith('tel:') ||
      target.startsWith('data:') ||
      target.startsWith('javascript:')
    ) {
      continue;
    }

    if (target.startsWith('#')) {
      const id = decodeURIComponent(target.slice(1));

      if (id && !getHtmlIds(html).has(id)) {
        throw new Error(`${relativeHtmlPath} links to missing local anchor #${id}.`);
      }
      continue;
    }

    const url = new URL(target, deployedPageUrl);

    if (url.origin !== new URL(siteUrl).origin) continue;

    const artifactPath = getArtifactPathFromPublicUrl(distDirectory, url.pathname, basePath);

    if (!artifactPath || !existsSync(artifactPath)) {
      throw new Error(`${relativeHtmlPath} links to missing internal artifact ${url.pathname}.`);
    }

    if (url.hash && artifactPath.endsWith('.html')) {
      const targetHtml = readFileSync(artifactPath, 'utf8');
      const id = decodeURIComponent(url.hash.slice(1));

      if (id && !getHtmlIds(targetHtml).has(id)) {
        throw new Error(
          `${relativeHtmlPath} links to missing anchor ${url.hash} in ${url.pathname}.`,
        );
      }
    }
  }
};

const verifyLlmsLinks = (
  llmsText: string,
  distDirectory: string,
  basePath: string,
  siteUrl: string,
): void => {
  const siteOrigin = new URL(siteUrl).origin;

  for (const match of llmsText.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
    const target = match[1] ?? '';
    const url = new URL(target, siteUrl);

    if (url.origin !== siteOrigin) continue;

    const artifactPath = getArtifactPathFromPublicUrl(distDirectory, url.pathname, basePath);

    if (!artifactPath || !existsSync(artifactPath)) {
      throw new Error(`llms.txt links to missing internal artifact ${url.pathname}.`);
    }
  }
};

/**
 * Verifies static routes, base-aware links, machine surfaces, and private-source isolation.
 * @throws
 * - INVALID_BASE_PATH: The website base path contains unsupported URL characters.
 * - INVALID_SEARCH_INDEX: The documentation search index is invalid.
 * - If the website model has not been generated
 * - If the production artifact contradicts the generated website model
 */
export const verifyProductionBuild = (): void => {
  const websiteDirectory = getWebsiteDirectory();
  const distDirectory = join(websiteDirectory, 'dist');
  const basePath = normalizeBasePath(process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);
  const siteUrl = process.env['SITE_URL'] ?? DEFAULT_SITE_URL;
  const model = loadWebsiteModel();

  if (!existsSync(distDirectory)) throw new Error('Production artifact is missing.');

  for (const route of model.routes) {
    const artifactPath = routeToArtifactPath(distDirectory, route);

    if (!existsSync(artifactPath)) {
      throw new Error(`Generated route ${route} has no static artifact.`);
    }
  }

  for (const requiredPath of [
    'favicon.ico',
    'llms.txt',
    'logo/icon-dark.png',
    'logo/icon-light.png',
    'logo/logo-dark.png',
    'logo/logo-light.png',
    'logo/source.jpg',
    'logo/wordmark-dark.png',
    'logo/wordmark-light.png',
    'open-graph/ogimage.png',
    'robots.txt',
    'search-index.json',
    'sitemap-0.xml',
    'sitemap-index.xml',
  ]) {
    if (!existsSync(join(distDirectory, requiredPath))) {
      throw new Error(`Production artifact is missing ${requiredPath}.`);
    }
  }

  const files = listFiles(distDirectory);
  const htmlPaths = files.filter((path) => path.endsWith('.html'));

  for (const htmlPath of htmlPaths) verifyHtmlLinks(distDirectory, htmlPath, basePath, siteUrl);
  verifySeoMetadata(distDirectory, files, htmlPaths, basePath, siteUrl);

  const publicText = files
    .filter((path) => ['.html', '.txt', '.xml', '.json'].includes(extname(path)))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  if (publicText.includes('@moldea.ai/skill-website')) {
    throw new Error('The private website package identity leaked into public output.');
  }
  if (files.some((path) => /(?:^|\/)(?:server|_server)(?:\/|$)/u.test(path))) {
    throw new Error('The static artifact contains request-time server output.');
  }
  if (files.some((path) => /\.test-(?:unit|integration|e2e|bench)\./u.test(path))) {
    throw new Error('The static artifact contains a test file.');
  }

  const homeHtml = readFileSync(join(distDirectory, 'index.html'), 'utf8');
  const llmsText = readFileSync(join(distDirectory, 'llms.txt'), 'utf8');
  const searchDocuments = parseSearchDocuments(
    JSON.parse(readFileSync(join(distDirectory, 'search-index.json'), 'utf8')),
  );

  if (!homeHtml.includes(SKILLS_DIRECTORY_URL) || !llmsText.includes(SKILLS_DIRECTORY_URL)) {
    throw new Error('The primary skills.sh distribution link is missing from public entry points.');
  }
  if (!llmsText.includes(`${siteUrl.replace(/\/$/u, '')}${basePath}docs/getting-started/`)) {
    throw new Error('llms.txt does not use the configured canonical documentation origin.');
  }

  verifyLlmsLinks(llmsText, distDirectory, basePath, siteUrl);

  for (const searchDocument of searchDocuments) {
    const artifactPath = getArtifactPathFromPublicUrl(
      distDirectory,
      new URL(searchDocument.url, siteUrl).pathname,
      basePath,
    );

    if (!artifactPath || !existsSync(artifactPath)) {
      throw new Error(`The production search index links to missing ${searchDocument.url}.`);
    }
  }

  for (const searchRecord of model.searchRecords) {
    const searchDocument = searchDocuments.find(({ url }) => url.endsWith(searchRecord.route));

    if (!searchDocument || searchDocument.description !== searchRecord.description) {
      throw new Error(`The search index omits or contradicts ${searchRecord.route}.`);
    }
  }

  for (const document of model.documents) {
    const llmsLine = llmsText.split('\n').find((line) => line.startsWith(`- [${document.title}](`));

    if (!llmsLine || !llmsLine.includes(`: ${document.description}`)) {
      throw new Error(`llms.txt omits the responsibility for ${document.sourcePath}.`);
    }
    if (!searchDocuments.some(({ url }) => url.endsWith(document.route))) {
      throw new Error(`The search index omits ${document.route}.`);
    }
  }

  for (const profile of model.qualification.profiles) {
    const expectedLlmsLine = `- [${profile.title}](${createCanonicalUrl(profile.route, siteUrl, basePath)}): ${profile.description}`;

    if (!llmsText.split('\n').includes(expectedLlmsLine)) {
      throw new Error(`llms.txt omits qualification profile ${profile.adapterId}.`);
    }
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyProductionBuild();
}
