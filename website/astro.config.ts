import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { DEFAULT_BASE_PATH, normalizeBasePath, withBase } from '@moldea.ai/website-ui/site';

import { RETIRED_PAGE_REDIRECTS } from './src/lib/redirects/index.ts';

import { DEFAULT_SITE_URL } from './src/lib/site/constants.ts';

const site = process.env['SITE_URL'] ?? DEFAULT_SITE_URL;
const base = normalizeBasePath(process.env['BASE_PATH'] ?? DEFAULT_BASE_PATH);

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  redirects: Object.fromEntries(
    Object.entries(RETIRED_PAGE_REDIRECTS).map(([route, target]) => [
      route,
      withBase(target, base),
    ]),
  ),
  // the public CDN rejects requests carrying Sec-Purpose: prefetch
  prefetch: false,
  integrations: [
    sitemap({
      filter: (page) =>
        new URL(page).pathname !== withBase('/search/', base) &&
        !Object.keys(RETIRED_PAGE_REDIRECTS).some(
          (route) => new URL(page).pathname === withBase(route, base),
        ),
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light-default',
        dark: 'github-dark-default',
      },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
