import type { APIRoute } from 'astro';
import { createCanonicalUrl, withBase } from '@moldea.ai/website-ui/site';

export const prerender = true;

/**
 * Serves crawler instructions for the configured public deployment.
 * @throws
 * - INVALID_BASE_PATH: The website base path contains unsupported URL characters.
 */
export const GET: APIRoute = () => {
  const siteUrl = import.meta.env.SITE;
  const basePath = import.meta.env.BASE_URL;
  const contents = [
    'User-agent: *',
    `Allow: ${withBase('/', basePath)}`,
    `Sitemap: ${createCanonicalUrl('/sitemap-index.xml', siteUrl, basePath)}`,
    '',
  ].join('\n');

  return new Response(contents, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
