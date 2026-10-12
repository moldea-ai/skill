// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

import {
  createEvidenceBundle,
  type IEvidencePreparationManifest,
  type IEvidenceSelection,
} from '../../../../src/evidence/index.ts';
import { calculateSha256 } from '../../../../src/filesystem/index.ts';
import { prepareSyntheticWebsiteEvidence } from '../../../scripts/evidence-fixture/index.ts';

import { loadReleaseEvidenceWebsiteState } from './loader.ts';

const temporaryRoots: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test.each([null, 'journeys', 'semantic'] as const)(
  'loads the paired optional journeys contracts with kind %s',
  async (kind) => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-website-evidence-'));
    temporaryRoots.push(root);
    const options = await prepareSyntheticWebsiteEvidence(root);
    if (kind !== null) {
      const manifestPath = path.join(options.preparedDirectory, 'manifest.json');
      const manifest = JSON.parse(
        await readFile(manifestPath, 'utf8'),
      ) as IEvidencePreparationManifest;
      const selection = JSON.parse(
        await readFile(options.selectionPath, 'utf8'),
      ) as IEvidenceSelection;
      const bundle = createEvidenceBundle({
        kind,
        classification: 'fixture',
        payload: {},
        run: {
          attemptId: 'fixture-journeys',
          evaluatedAt: '2026-01-01T00:00:00.000Z',
          status: 'passed',
          version: 'fixture',
          provenance: {},
        },
      });
      const source = JSON.stringify(bundle);
      const digest = calculateSha256(source);
      manifest.journeys = {
        path: 'journeys.json',
        assetsPath: 'assets/journeys',
        bundleSha256: digest,
        preparedSha256: digest,
      };
      selection.journeys = {
        assetName: 'fixture-journeys.json.gz',
        classification: 'official',
        repository: 'moldea-ai/skill',
        sha256: digest,
        tag: 'evidence-fixture-journeys',
      };
      manifest.selectionSha256 = calculateSha256(`${JSON.stringify(selection)}\n`);
      await Promise.all([
        writeFile(path.join(options.preparedDirectory, 'journeys.json'), source),
        writeFile(manifestPath, JSON.stringify(manifest)),
        writeFile(options.selectionPath, JSON.stringify(selection)),
      ]);
    }
    const load = () =>
      loadReleaseEvidenceWebsiteState(root, 'fixture', { ...options, allowFixture: true });
    if (kind === 'semantic') expect(load).toThrow('unsupported classification or kind');
    else expect(load().semantic.latest?.result.attemptId).toBe('fixture-semantic-run');
  },
);
