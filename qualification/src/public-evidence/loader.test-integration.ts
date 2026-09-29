// @vitest-environment node
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  getFixtureAttemptDirectory,
  seedPassingQualificationEvidenceFixture,
} from '../../vitest/evidence-fixture.ts';
import { writeTextFileAtomically } from '../../../src/filesystem/index.ts';
import { recordQualificationResult } from '../result/index.ts';
import { loadQualificationWebsiteModel } from './loader.ts';
import { parseQualificationWebsiteModel } from './validation.ts';

const temporaryRoots: string[] = [];
const CANDIDATE_PACKAGE = {
  name: '@moldea.ai/cli',
  registryIntegrity: `sha512-${'a'.repeat(86)}`,
  registryShasum: 'b'.repeat(40),
  registryTarballUrl: 'https://registry.npmjs.org/@moldea.ai/cli/-/cli-9.0.0.tgz',
  sha256: 'c'.repeat(64),
  tarballName: 'cli-9.0.0.tgz',
  version: '9.0.0',
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('qualification public evidence selection', () => {
  test('loads a selected adapter with its Custom baseline without other profile results', async () => {
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-qualification-profiles-'));
    temporaryRoots.push(temporaryRoot);
    const resultsRoot = path.join(temporaryRoot, 'results');
    await mkdir(resultsRoot);
    const repositoryRoot = path.resolve(import.meta.dirname, '../../..');
    const profileKeys = new Set(['t5', 't10']);

    const websiteModel = loadQualificationWebsiteModel(repositoryRoot, {
      profileKeys,
      resultsRoot,
    });

    expect(
      websiteModel.profiles.map(
        ({ adapterId, implementationId }) => `${adapterId}/${implementationId}`,
      ),
    ).toStrictEqual(['custom/custom', 'langgraph/typescript-state-graph-1-4']);
    expect(websiteModel.profiles[1]?.sharedCases).toStrictEqual(websiteModel.profiles[0]?.cases);
    expect(websiteModel.profiles.map(({ currentStatus }) => currentStatus)).toStrictEqual([
      'not-recorded',
      'not-recorded',
    ]);
    expect(() =>
      loadQualificationWebsiteModel(repositoryRoot, {
        profileKeys: new Set(['t10']),
        resultsRoot,
      }),
    ).toThrow('Selected qualification profiles must include the indexed Custom baseline.');
  });

  test('loads only the exact attempt selected for each profile snapshot', async () => {
    const repositoryRoot = await mkdtemp(path.join(tmpdir(), 'moldea-qualification-selection-'));
    temporaryRoots.push(repositoryRoot);
    const resultsRoot = path.join(repositoryRoot, 'qualification', 'results');
    const sanitizationContext = {
      attemptDirectory: repositoryRoot,
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
        {
          artifactDirectory,
          attemptDirectory: getFixtureAttemptDirectory(resultsRoot, attemptId),
          result:
            attemptId === 'attempt-old'
              ? { ...result, provenance: { ...result.provenance, model: 'gpt-5.6-sol' } }
              : result,
          sanitizationContext,
        },
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
    expect(profile?.attempts[0]?.result.provenance.model).toBe('gpt-5.6-sol');
    expect(profile?.currentLatest?.result.attemptId).toBe('attempt-old');
    expect(profile?.latest).toMatchObject({
      lastPassingAttemptId: 'attempt-old',
      latestAttemptId: 'attempt-old',
      latestStatus: 'passed',
    });

    const historicalPresentation = structuredClone(websiteModel);
    for (const historicalProfile of historicalPresentation.profiles) {
      for (const attempt of historicalProfile.attempts) attempt.result.protocolVersion = 11;
      if (historicalProfile.currentLatest !== null) {
        historicalProfile.currentLatest.result.protocolVersion = 11;
      }
      if (historicalProfile.currentLastPassing !== null) {
        historicalProfile.currentLastPassing.result.protocolVersion = 11;
      }
    }
    expect(
      parseQualificationWebsiteModel(historicalPresentation).profiles[0]?.attempts[0]?.result
        .protocolVersion,
    ).toBe(11);

    const unsupportedAttempt = historicalPresentation.profiles[0]!.attempts[0]!.result;
    Object.assign(unsupportedAttempt, { protocolVersion: 0 });
    expect(() => parseQualificationWebsiteModel(historicalPresentation)).toThrow();

    Object.assign(unsupportedAttempt, { protocolVersion: 99 });
    expect(() => parseQualificationWebsiteModel(historicalPresentation)).toThrow();
  });
});
