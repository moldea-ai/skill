// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { sanitizeEvidenceText, sanitizeEvidenceValue } from './sanitizer.ts';

describe('qualification evidence sanitization', () => {
  test('replaces host paths and recognizable credentials without changing JSON shape', () => {
    const context = {
      packagesRepository: '/work/packages',
      skillRepository: '/work/skill',
      workspaceDirectory: '/work/attempt/workspace',
    };
    const token = `sk-${'a'.repeat(24)}`;

    expect(
      sanitizeEvidenceValue(
        {
          command: '/work/packages/node_modules/.bin/moldea',
          nested: ['/work/attempt/workspace/moldea/moldea.yaml', token],
        },
        context,
      ),
    ).toStrictEqual({
      command: '<packages-repository>/node_modules/.bin/moldea',
      nested: ['<workspace>/moldea/moldea.yaml', '<redacted-token>'],
    });
    expect(sanitizeEvidenceText('https://user:password@example.com/resource', context)).toBe(
      'https://<redacted-credentials>@example.com/resource',
    );
  });
});
