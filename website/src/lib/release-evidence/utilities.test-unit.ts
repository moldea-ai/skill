// @vitest-environment node
import { expect, test } from 'vitest';
import { expectToThrowCode } from 'web-utils-kit';

import { getPublicEvidenceHref } from './index.ts';

test.each([
  ['/evidence-assets/qualification/trial.patch', '/', '/evidence-assets/qualification/trial.patch'],
  [
    '/evidence-assets/qualification/trial.patch',
    '/skill-preview/',
    '/skill-preview/evidence-assets/qualification/trial.patch',
  ],
  [
    '/evidence-assets/semantic/attempt.json',
    '/skill-preview/',
    '/skill-preview/evidence-assets/semantic/attempt.json',
  ],
  [
    'https://github.com/moldea-ai/skill/blob/main/README.md',
    '/skill-preview/',
    'https://github.com/moldea-ai/skill/blob/main/README.md',
  ],
])('getPublicEvidenceHref(%s, %s) -> %s', (href, basePath, expectedHref) => {
  expect(getPublicEvidenceHref(href, basePath)).toBe(expectedHref);
});

test('preserves the configuration error contract for an invalid local deployment path', () => {
  expectToThrowCode(
    () => getPublicEvidenceHref('/evidence-assets/semantic/attempt.json', '/invalid path/'),
    'INVALID_BASE_PATH',
    'The website base path contains unsupported URL characters.',
  );
});
