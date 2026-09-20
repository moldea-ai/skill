// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { rewriteQualificationSourceUrls } from './projection.ts';

describe('rewriteQualificationSourceUrls', () => {
  test('rewrites repository files while preserving directories and unrelated URLs', () => {
    expect(
      rewriteQualificationSourceUrls({
        directory:
          'https://github.com/moldea-ai/skill/tree/immutable-revision/qualification/profiles/t1',
        file: 'https://github.com/moldea-ai/skill/blob/immutable-revision/qualification/profiles/t1/profile.yaml',
        nested: [
          'https://raw.githubusercontent.com/moldea-ai/skill/immutable-revision/.evidence/qualification/results/t1/latest.json',
        ],
        unrelated: 'https://example.com/evidence.json',
      }),
    ).toStrictEqual({
      directory:
        'https://github.com/moldea-ai/skill/tree/immutable-revision/qualification/profiles/t1',
      file: '/evidence-assets/qualification/qualification/profiles/t1/profile.yaml',
      nested: ['/evidence-assets/qualification/.evidence/qualification/results/t1/latest.json'],
      unrelated: 'https://example.com/evidence.json',
    });
  });
});
