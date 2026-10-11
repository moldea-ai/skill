// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createCanonicalUrl, withBase } from '@moldea.ai/website-ui/site';
import { expect, test } from 'vitest';

import { verifySeoMetadata } from './seo-verification.ts';

const siteUrl = 'https://example.com';

const verifyRedirect = (html: string, basePath: string, sitemapLocation = '') => {
  const directory = mkdtempSync(join(tmpdir(), 'moldea-redirect-seo-'));
  try {
    const htmlPath = join(directory, 'retired.html');
    const sitemapPath = join(directory, 'sitemap-0.xml');
    const robotsPath = join(directory, 'robots.txt');
    writeFileSync(htmlPath, html);
    writeFileSync(
      sitemapPath,
      sitemapLocation === ''
        ? '<urlset/>'
        : `<urlset><url><loc>${sitemapLocation}</loc></url></urlset>`,
    );
    writeFileSync(
      robotsPath,
      `Sitemap: ${createCanonicalUrl('/sitemap-index.xml', siteUrl, basePath)}\n`,
    );
    verifySeoMetadata(
      directory,
      [htmlPath, sitemapPath, robotsPath],
      [htmlPath],
      basePath,
      siteUrl,
    );
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};

const createRedirect = (basePath: string) => {
  const target = withBase('/evidence/', basePath);
  return `<meta http-equiv="refresh" content="0;url=${target}"><meta name="robots" content="noindex"><link rel="canonical" href="${createCanonicalUrl('/evidence/', siteUrl, basePath)}"><a href="${target}">Continue</a>`;
};

test.each(['/', '/preview/'])(
  'accepts immediate redirects with destination canonicals at %s',
  (basePath) => {
    expect(() => verifyRedirect(createRedirect(basePath), basePath)).not.toThrow();
  },
);

test.each([
  ['delayed refresh', (html: string) => html.replace('0;url=', '1;url=')],
  [
    'external target',
    (html: string) => html.replace('0;url=/evidence/', '0;url=https://other.example/'),
  ],
  [
    'protocol-relative target',
    (html: string) => html.replace('0;url=/evidence/', '0;url=//other.example/'),
  ],
  [
    'duplicate refresh',
    (html: string) => `${html}<meta http-equiv="refresh" content="0;url=/evidence/">`,
  ],
  ['missing noindex', (html: string) => html.replace('<meta name="robots" content="noindex">', '')],
  ['missing canonical', (html: string) => html.replace(/<link[^>]+>/u, '')],
  [
    'source canonical',
    (html: string) => html.replace('https://example.com/evidence/', 'https://example.com/retired/'),
  ],
  ['missing fallback', (html: string) => html.replace(/<a[^>]+>/u, '<a>')],
])('rejects redirect with %s', (_scenario, change) => {
  expect(() => verifyRedirect(change(createRedirect('/')), '/')).toThrow();
});

test('rejects a retired redirect included in the sitemap', () => {
  expect(() => verifyRedirect(createRedirect('/'), '/', 'https://example.com/retired/')).toThrow(
    'sitemap must contain exactly',
  );
});
