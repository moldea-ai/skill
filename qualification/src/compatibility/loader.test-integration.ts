// @vitest-environment node
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import { DEFAULT_PACKAGES_REPOSITORY } from '../constants/index.ts';
import { inspectQualificationCoverage } from '../coverage/index.ts';
import { ensureDirectory } from '../filesystem/index.ts';
import { resolveQualificationTarget } from './loader.ts';

test.each([
  ['custom', 'custom', 8],
  ['vercel-ai-sdk', 'typescript-generate-stream-text-7', 10],
  ['vercel-ai-sdk', 'typescript-tool-loop-agent-7', 10],
] as const)(
  'preflights every %s/%s scenario before execution',
  async (adapterId, implementationId, expectedCaseCount) => {
    const target = await resolveQualificationTarget({ adapterId, implementationId });

    expect(target.profile.cases).toHaveLength(expectedCaseCount);
  },
);

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
      'initialize-grounded-project',
      'create-grounded-agent',
      'maintain-dirty-project',
      'reconcile-drift-and-boundaries',
      'retire-agent-coherently',
      'stop-on-material-ambiguity',
      'resist-untrusted-repository-instructions',
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

  test('ignores publication metadata when deriving qualification claims', async () => {
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
    const changedPublicationCoverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      {
        ...target.target,
        lastVerifiedAt: '2099-01-01',
        qualificationEvidence: {
          url: 'https://skill.moldea.ai/evidence/qualification/custom/custom/',
        },
      },
    );

    expect(changedPublicationCoverage).toStrictEqual(currentCoverage);
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

describe('Vercel AI SDK direct-generation qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'vercel-ai-sdk',
      implementationId: 'typescript-generate-stream-text-7',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@types/json-schema', version: '7.0.15' },
      { name: '@types/node', version: '22.20.1' },
      { name: 'ai', version: '7.0.77' },
      { name: 'zod', version: '4.3.6' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'evaluate-aligned-project',
      'initialize-grounded-project',
      'create-grounded-agent',
      'maintain-dirty-project',
      'reconcile-drift-and-boundaries',
      'retire-agent-coherently',
      'stop-on-material-ambiguity',
      'resist-untrusted-repository-instructions',
      'repair-vercel-tool-registration',
      'preserve-vercel-static-boundary',
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

  test('rejects an exact runtime pin outside the selected target range', async () => {
    const temporaryPackagesRepository = await mkdtemp(
      path.join(os.tmpdir(), 'moldea-qualification-packages-'),
    );
    const compatibilityDirectory = path.join(temporaryPackagesRepository, 'compatibility');
    const sourceMatrixPath = path.join(
      DEFAULT_PACKAGES_REPOSITORY,
      'compatibility',
      'runtimes.yaml',
    );
    const temporaryMatrixPath = path.join(compatibilityDirectory, 'runtimes.yaml');
    await ensureDirectory(compatibilityDirectory);
    const matrixSource = await readFile(sourceMatrixPath, 'utf8');
    const incompatibleMatrixSource = matrixSource.replace(
      /(id: typescript-generate-stream-text-7[\s\S]*?name: ai[\s\S]*?versionRange:) '>=7\.0\.66 <8\.0\.0'/u,
      "$1 '>=8.0.0 <9.0.0'",
    );
    await writeFile(temporaryMatrixPath, incompatibleMatrixSource, 'utf8');

    try {
      expect(incompatibleMatrixSource).not.toBe(matrixSource);
      await expect(
        resolveQualificationTarget(
          {
            adapterId: 'vercel-ai-sdk',
            implementationId: 'typescript-generate-stream-text-7',
          },
          temporaryPackagesRepository,
        ),
      ).rejects.toThrow(
        'Qualification profile has incompatible target runtime packages: ai@7.0.77 does not satisfy >=8.0.0 <9.0.0.',
      );
    } finally {
      await rm(temporaryPackagesRepository, { force: true, recursive: true });
    }
  });
});

describe('Vercel AI SDK ToolLoopAgent qualification profile', () => {
  test('pins the real SDK boundary and covers every matrix claim and profile case', async () => {
    const target = await resolveQualificationTarget({
      adapterId: 'vercel-ai-sdk',
      implementationId: 'typescript-tool-loop-agent-7',
    });
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
    );

    expect(target.profile.runtimePackages).toStrictEqual([
      { name: '@ai-sdk/workflow', version: '2.0.7' },
      { name: '@types/json-schema', version: '7.0.15' },
      { name: '@types/node', version: '22.20.1' },
      { name: 'ai', version: '7.0.77' },
      { name: 'workflow', version: '5.0.0-beta.42' },
      { name: 'zod', version: '4.3.6' },
    ]);
    expect(target.profile.cases.map(({ id }) => id)).toStrictEqual([
      'evaluate-aligned-project',
      'initialize-grounded-project',
      'create-grounded-agent',
      'maintain-dirty-project',
      'reconcile-drift-and-boundaries',
      'retire-agent-coherently',
      'stop-on-material-ambiguity',
      'resist-untrusted-repository-instructions',
      'repair-vercel-tool-registration',
      'preserve-vercel-static-boundary',
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
});
