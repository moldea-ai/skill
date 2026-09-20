// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { seedPassingQualificationEvidenceFixture } from '../../vitest/evidence-fixture.ts';
import { writeTextFileAtomically } from '../../../src/filesystem/index.ts';
import { recordQualificationResult } from '../result/index.ts';
import { loadQualificationWebsiteModel } from './loader.ts';

const temporaryRoots: string[] = [];
const CANDIDATE_PACKAGE = {
  name: '@moldea.ai/cli',
  registryIntegrity: `sha512-${'a'.repeat(86)}`,
  registryShasum: 'b'.repeat(40),
  registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-8.0.0.tgz',
  sha256: 'c'.repeat(64),
  tarballName: 'cli-8.0.0.tgz',
  version: '8.0.0',
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('qualification public evidence selection', () => {
  test('loads only the exact attempt selected for each profile snapshot', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-qualification-selection-'));
    temporaryRoots.push(repositoryRoot);
    const resultsRoot = path.join(repositoryRoot, 'qualification', 'results');
    const sanitizationContext = {
      attemptDirectory: repositoryRoot,
      packagesRepository: path.join(repositoryRoot, 'packages'),
      skillRepository: path.join(repositoryRoot, 'skill'),
    };
    await seedPassingQualificationEvidenceFixture({
      artifactDirectory: path.join(repositoryRoot, 'artifacts-bootstrap'),
      attemptId: 'attempt-bootstrap',
      packages: [CANDIDATE_PACKAGE],
      resultsRoot,
    });
    const projectDirectory = path.join(
      repositoryRoot,
      'qualification',
      'profiles',
      't1',
      'cases',
      'c1',
    );
    await Promise.all([
      writeTextFileAtomically(path.join(projectDirectory, 'README.md'), '# Fixture project\n'),
      writeTextFileAtomically(path.join(projectDirectory, 'task.md'), '# Release case\n'),
    ]);

    for (const attemptId of ['attempt-old', 'attempt-new']) {
      const artifactDirectory = path.join(repositoryRoot, `artifacts-${attemptId}`);
      const result = await seedPassingQualificationEvidenceFixture({
        artifactDirectory,
        attemptId,
        packages: [CANDIDATE_PACKAGE],
        resultsRoot,
      });
      await recordQualificationResult(
        { artifactDirectory, result, sanitizationContext },
        resultsRoot,
      );
    }

    const websiteModel = loadQualificationWebsiteModel(repositoryRoot, {
      profilesRoot: path.join(repositoryRoot, 'qualification', 'profiles'),
      resultsRoot,
      revision: 'fixture-revision',
      selectedAttemptIds: new Map([['t1', 'attempt-old']]),
    });
    const profile = websiteModel.profiles[0];

    expect(profile?.attempts.map(({ result }) => result.attemptId)).toStrictEqual(['attempt-old']);
    expect(profile?.currentLatest?.result.attemptId).toBe('attempt-old');
    expect(profile?.latest).toMatchObject({
      lastPassingAttemptId: 'attempt-old',
      latestAttemptId: 'attempt-old',
      latestStatus: 'passed',
    });
  });
});
