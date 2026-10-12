// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

import type {
  IEvidencePreparationManifest,
  IEvidenceSelection,
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
    const manifestPath = path.join(options.preparedDirectory, 'manifest.json');
    const manifest = JSON.parse(
      await readFile(manifestPath, 'utf8'),
    ) as IEvidencePreparationManifest;
    const selection = JSON.parse(
      await readFile(options.selectionPath, 'utf8'),
    ) as IEvidenceSelection;
    if (kind === null) {
      manifest.journeys = null;
      selection.journeys = null;
    } else if (kind === 'semantic') {
      const bundlePath = path.join(options.preparedDirectory, manifest.journeys!.path);
      const source = (await readFile(bundlePath, 'utf8')).replace(
        '"kind": "journeys"',
        '"kind": "semantic"',
      );
      await writeFile(bundlePath, source);
      manifest.journeys!.preparedSha256 = calculateSha256(source);
    }
    manifest.selectionSha256 = calculateSha256(`${JSON.stringify(selection)}\n`);
    await Promise.all([
      writeFile(manifestPath, JSON.stringify(manifest)),
      writeFile(options.selectionPath, JSON.stringify(selection)),
    ]);
    const load = () =>
      loadReleaseEvidenceWebsiteState(root, 'fixture', { ...options, allowFixture: true });
    if (kind === 'semantic') expect(load).toThrow('unsupported classification or kind');
    else {
      const state = load();
      expect(state.semantic.latest?.result.attemptId).toBe('fixture-semantic-run');
      expect(state.scriptedJourneys?.journeys.length ?? null).toBe(kind === null ? null : 3);
    }
  },
);
