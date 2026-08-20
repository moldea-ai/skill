// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { inspectQualificationCoverage } from '../coverage/index.ts';
import { resolveQualificationTarget } from './loader.ts';

describe('Custom qualification profile', () => {
  test('matches the matrix and covers every declared semantic case and claim', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'custom',
      implementationId: 'custom',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'evaluate-aligned-project',
      'maintain-dirty-project',
      'reconcile-drift-and-boundaries',
    ]);
    expect(coverage).toStrictEqual({
      passed: true,
      requiredClaims: coverage.declaredClaims,
      declaredClaims: coverage.declaredClaims,
      missingClaims: [],
      unknownClaims: [],
      uncoveredCaseIds: [],
    });
  });

  test.each([
    [
      'repository format version',
      (adapter: Awaited<ReturnType<typeof resolveQualificationTarget>>['adapter']) => ({
        ...adapter,
        supportedRepositoryFormatVersions: [
          ...(adapter.supportedRepositoryFormatVersions ?? []),
          2,
        ],
      }),
      'adapter.supported-repository-format-version.2',
    ],
    [
      'compatible Core range',
      (adapter: Awaited<ReturnType<typeof resolveQualificationTarget>>['adapter']) => ({
        ...adapter,
        compatibleCoreRange: '^3.0.0',
      }),
      'adapter.compatible-core-range.^3.0.0',
    ],
  ] as const)(
    'invalidates coverage when the matrix adds or changes its %s claim',
    async (_description, mutateAdapter, expectedMissingClaim) => {
      const target = await resolveQualificationTarget({
        adapterId: 'custom',
        implementationId: 'custom',
      });
      const coverage = await inspectQualificationCoverage(
        target.profileDirectory,
        target.profile,
        mutateAdapter(target.adapter),
        target.target,
      );

      expect(coverage.passed).toBe(false);
      expect(coverage.missingClaims).toContain(expectedMissingClaim);
    },
  );
});
