// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  createCanonicalUrl,
  DEFAULT_BASE_PATH,
  DEFAULT_SITE_URL,
  isPublicRouteActive,
  normalizeBasePath,
  withBase,
} from './url.ts';

describe('website URL utilities', () => {
  test.each([
    ['/', '/'],
    ['', '/'],
    ['skill', '/skill/'],
    ['/skill/', '/skill/'],
  ])('normalizeBasePath(%s) -> %s', (input, expected) => {
    expect(normalizeBasePath(input)).toBe(expected);
  });

  test('rejects unsupported deployment paths', () => {
    expect(() => normalizeBasePath('/skill path/')).toThrow(
      'The website base path contains unsupported URL characters.',
    );
  });

  test('builds root and project-site routes without component changes', () => {
    expect(withBase('/docs/', DEFAULT_BASE_PATH)).toBe('/docs/');
    expect(withBase('/docs/', '/skill/')).toBe('/skill/docs/');
    expect(createCanonicalUrl('/llms.txt', DEFAULT_SITE_URL, DEFAULT_BASE_PATH)).toBe(
      'https://skill.moldea.ai/llms.txt',
    );
  });

  test.each([
    ['/', '/', '/', true],
    ['/docs/', '/', '/', false],
    ['/skill/', '/', '/skill/', true],
    ['/skill/docs/', '/', '/skill/', false],
    ['/docs/coding-agent-compatibility/', '/docs/', '/', true],
    ['/docs/capabilities/', '/docs/capabilities/', '/', true],
    ['/examples/create-a-support-agent/', '/examples/', '/', true],
    ['/examples/', '/docs/', '/', false],
    ['/search/', '/search/', '/', true],
    ['/skill/docs/getting-started/', '/docs/', '/skill/', true],
    ['/404.html', '/', '/', false],
  ])('isPublicRouteActive(%s, %s, %s) -> %s', (pathname, route, basePath, expectedResult) => {
    expect(isPublicRouteActive(pathname, route, basePath)).toBe(expectedResult);
  });
});
