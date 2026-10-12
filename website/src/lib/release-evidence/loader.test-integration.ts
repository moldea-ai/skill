// @vitest-environment node
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

import type {
  IEvidencePreparationManifest,
  IEvidenceSelection,
} from '../../../../src/evidence/index.ts';
import { calculateSha256 } from '../../../../src/filesystem/index.ts';
import type { IScriptedJourneysWebsiteModel } from '../../../../src/scripted-journeys/public-evidence/index.ts';
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
      expect(state.scriptedJourneys?.journeys.length ?? null).toBe(kind === null ? null : 18);
    }
  },
);

test.each(['raw-source', 'capture', 'envelope'] as const)(
  'rejects mismatched %s before copying public journey assets',
  async (mutation) => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-website-source-'));
    temporaryRoots.push(root);
    const options = await prepareSyntheticWebsiteEvidence(root);
    const manifestPath = path.join(options.preparedDirectory, 'manifest.json');
    const manifest = JSON.parse(
      await readFile(manifestPath, 'utf8'),
    ) as IEvidencePreparationManifest;
    const bundlePath = path.join(options.preparedDirectory, manifest.journeys!.path);
    const bundle = JSON.parse(await readFile(bundlePath, 'utf8')) as {
      payload: { websiteModel: IScriptedJourneysWebsiteModel };
      run: { status: string };
    };
    const source = bundle.payload.websiteModel.sources[0]!;
    if (source.kind !== 'campaign') throw new Error('Expected current campaign.');
    if (mutation === 'raw-source')
      source.assessment.platforms[0]!.trials[0]!.observation!.observedAt = null;
    if (mutation === 'capture') Object.values(source.captures)[0]!.patch = 'forged';
    if (mutation === 'envelope') bundle.run.status = 'passed';
    const serialized = JSON.stringify(bundle);
    await writeFile(bundlePath, serialized);
    manifest.journeys!.preparedSha256 = calculateSha256(serialized);
    await writeFile(manifestPath, JSON.stringify(manifest));
    expect(() =>
      loadReleaseEvidenceWebsiteState(root, 'fixture', { ...options, allowFixture: true }),
    ).toThrow();
    await expect(lstat(path.join(root, 'website/public/evidence-assets'))).rejects.toThrow();
  },
);
