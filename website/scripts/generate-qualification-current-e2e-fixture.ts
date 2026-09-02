import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { writeTextFileAtomically } from '../../qualification/src/filesystem/index.ts';
import { recordQualificationResult } from '../../qualification/src/result/index.ts';
import { seedPassingQualificationEvidenceFixture } from '../../qualification/vitest/evidence-fixture.ts';
import { createWebsiteModel, writeWebsiteModel } from '../src/lib/generation/generation.ts';

const fixtureRoot = await mkdtemp(join(tmpdir(), 'moldea-qualification-website-e2e-'));

try {
  const attemptId = 'attempt-recovered';
  const resultsRoot = join(fixtureRoot, 'qualification', 'results');
  const artifactDirectory = join(fixtureRoot, '.qualification-artifacts');
  await Promise.all([
    writeTextFileAtomically(
      join(fixtureRoot, 'qualification', 'profiles', 't1', 'cases', 'c1', 'task.md'),
      '# Release case\n\nInspect the current evidence.\n',
    ),
    writeTextFileAtomically(
      join(fixtureRoot, 'qualification', 'profiles', 't1', 'cases', 'c1', 'README.md'),
      '# Release case\n\nThis fixture exercises recovered protocol 6 evidence.\n',
    ),
    writeTextFileAtomically(
      join(fixtureRoot, 'qualification', 'cases', 'cases.yaml'),
      `version: 2
cases:
  - id: release-case
    title: Release case
    layer: universal-baseline
    description: Inspect complete current evidence.
    challenge: Preserve every confirmation trial.
`,
    ),
  ]);
  const result = await seedPassingQualificationEvidenceFixture({
    artifactDirectory,
    attemptId,
    hasOperationalRetry: true,
    hasSkippedInitialJudge: true,
    isRecovered: true,
    packages: [
      {
        name: '@moldea.ai/cli',
        version: '4.0.0',
        registryIntegrity: `sha512-${'c'.repeat(86)}`,
        registryShasum: 'd'.repeat(40),
        registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-4.0.0.tgz',
        tarballName: 'cli-4.0.0.tgz',
        sha256: 'a'.repeat(64),
      },
    ],
    resultsRoot,
  });

  await recordQualificationResult(
    {
      artifactDirectory,
      result,
      sanitizationContext: {
        attemptDirectory: '/attempt',
        packagesRepository: '/packages',
        skillRepository: '/repositories/skill',
      },
    },
    resultsRoot,
  );
  await writeWebsiteModel(createWebsiteModel(fixtureRoot));
} finally {
  await rm(fixtureRoot, { force: true, recursive: true });
}
