// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { sanitizeEvidenceText, sanitizeEvidenceValue } from './sanitizer.ts';

describe('qualification evidence sanitization', () => {
  test('replaces host paths and recognizable credentials without changing JSON shape', () => {
    const context = {
      attemptDirectory: '/work/attempt',
      packagesRepository: '/work/packages',
      skillRepository: '/work/skill',
      workspaceDirectory: '/work/attempt/workspace',
    };
    const token = `sk-${'a'.repeat(24)}`;

    expect(
      sanitizeEvidenceValue(
        {
          command: '/work/packages/node_modules/.bin/moldea',
          authorization: `Bearer ${'b'.repeat(24)}`,
          nested: ['/work/attempt/workspace/moldea/moldea.yaml', token],
          provider: { apiKey: 'provider-value-that-is-not-prefix-recognizable' },
        },
        context,
      ),
    ).toStrictEqual({
      command: '<packages-repository>/node_modules/.bin/moldea',
      authorization: '<redacted-credential>',
      nested: ['<workspace>/moldea/moldea.yaml', '<redacted-token>'],
      provider: { apiKey: '<redacted-credential>' },
    });
    expect(sanitizeEvidenceText('https://user:password@example.com/resource', context)).toBe(
      'https://<redacted-credentials>@example.com/resource',
    );
    expect(
      sanitizeEvidenceText(
        `OPENAI_API_KEY=${'c'.repeat(24)} ghp_${'d'.repeat(24)} /home/evaluator/output.json`,
        context,
      ),
    ).toBe('OPENAI_API_KEY=<redacted-credential> <redacted-token> <sandbox-home>/output.json');
  });
});
