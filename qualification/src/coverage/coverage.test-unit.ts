// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { deriveRequiredQualificationClaims } from './coverage.ts';

describe('deriveRequiredQualificationClaims', () => {
  test('derives every current Custom matrix claim', () => {
    expect(
      deriveRequiredQualificationClaims(
        {
          implementation: {
            distribution: 'public',
            kind: 'built-in',
            package: '@moldea.ai/core',
          },
          implementationStatus: 'available',
          compatibleCoreRange: '^3.0.0',
          runtimeGuidance: { expectation: 'required' },
          supportedRepositoryFormatVersions: [1],
        },
        {
          id: 'custom',
          kind: 'custom',
          language: 'any',
          patterns: [
            {
              id: 'explicit-repository-relationships',
              kind: 'runtime',
              support: 'full',
              description: 'Universal explicit relationship validation.',
            },
          ],
          lastVerifiedAt: '2026-08-15',
        },
      ),
    ).toStrictEqual([
      'adapter.compatible-core-range.^3.0.0',
      'adapter.runtime-guidance',
      'adapter.supported-repository-format-version.1',
      'qualification.support-gate',
      'target.kind',
      'target.language',
      'target.pattern.explicit-repository-relationships',
    ]);
  });
});
