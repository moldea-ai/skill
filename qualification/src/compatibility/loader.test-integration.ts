// @vitest-environment node
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { DEFAULT_PACKAGES_REPOSITORY } from '../constants/index.ts';
import { inspectQualificationCoverage } from '../coverage/index.ts';
import { ensureDirectory } from '../filesystem/index.ts';
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

  test('records maturity separately without changing required qualification claims', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'custom',
      implementationId: 'custom',
    });
    const currentCoverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );
    const changedMaturityCoverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      {
        ...target.target,
        supportLevel: 'experimental',
        lastVerifiedAt: '2099-01-01',
      },
    );

    expect(changedMaturityCoverage).toStrictEqual(currentCoverage);
  });

  test('resolves the selected target from an explicit packages checkout', async () => {
    const temporaryPackagesRepository = await mkdtemp(
      path.join(os.tmpdir(), 'moldea-qualification-packages-'),
    );
    const compatibilityDirectory = path.join(temporaryPackagesRepository, 'compatibility');
    await ensureDirectory(compatibilityDirectory);
    await copyFile(
      path.join(DEFAULT_PACKAGES_REPOSITORY, 'compatibility', 'runtimes.yaml'),
      path.join(compatibilityDirectory, 'runtimes.yaml'),
    );

    try {
      const target = await resolveQualificationTarget(
        { adapterId: 'custom', implementationId: 'custom' },
        temporaryPackagesRepository,
      );

      expect(target.selection).toStrictEqual({
        adapterId: 'custom',
        implementationId: 'custom',
      });
    } finally {
      await rm(temporaryPackagesRepository, { force: true, recursive: true });
    }
  });
});
