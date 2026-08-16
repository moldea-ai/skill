// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  createCanonicalUrl,
  DEFAULT_BASE_PATH,
  DEFAULT_SITE_URL,
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
});
