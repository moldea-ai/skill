// @vitest-environment node
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { writeFileAtomic, writeJsonFile } from 'jg-fs';

import { calculateSha256 } from '../filesystem/index.ts';
import { createSyntheticJourneysBundle } from '../../website/scripts/evidence-fixture/journeys.ts';
import { createJourneysEvidenceBundle } from '../scripted-journeys/public-evidence/index.ts';
import {
  deriveCampaignStatus,
  resolveJourneyTrials,
} from '../scripted-journeys/confirmation/index.ts';
import type { IJourneyCampaign } from '../scripted-journeys/index.ts';
import { createEvidenceBundle, encodeEvidenceBundle } from './bundle.ts';
import {
  downloadHttpEvidenceAsset,
  prepareSelectedEvidence,
  verifyPreparedReleaseEvidence,
  type IDownloadEvidenceAsset,
} from './preparation.ts';
import { updateEvidenceSelection } from './selection.ts';
import type {
  IEvidenceClassification,
  IEvidenceKind,
  IEvidenceSelection,
  IEvidenceSelectionReference,
} from './types.ts';

const temporaryRoots: string[] = [];

const createAsset = (
  kind: IEvidenceKind,
  suffix: string,
  classification: IEvidenceClassification = 'official',
  status: 'passed' | 'failed' | 'incomplete' = 'passed',
) => {
  const encoded = encodeEvidenceBundle(
    createEvidenceBundle({
      classification,
      kind,
      payload: { cases: [{ id: `${kind}-${suffix}` }] },
      artifacts: [
        {
          content: Buffer.from(`${kind}-${suffix}\n`),
          mediaType: 'text/plain',
          path: `projects/${kind}-${suffix}.txt`,
        },
      ],
      run: {
        attemptId: `${kind}-${suffix}`,
        evaluatedAt: '2026-09-19T12:00:00.000Z',
        provenance: {},
        status,
        version: suffix,
      },
    }),
  );
  const sha256 = calculateSha256(encoded);
  const reference: IEvidenceSelectionReference = {
    assetName: `${kind}-${suffix}.json.gz`,
    classification: 'official',
    repository: 'moldea-ai/skill',
    sha256,
    tag: `evidence-${kind}-${suffix}`,
  };
  return { encoded, reference };
};

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('selected evidence preparation', () => {
  test.each(['partial', 'pending', 'full'] as const)(
    'prepares a projected %s campaign and preserves the release-assurance boundary',
    async (scope) => {
      const root = await mkdtemp(path.join(tmpdir(), 'moldea-campaign-assurance-'));
      temporaryRoots.push(root);
      const synthetic = createSyntheticJourneysBundle();
      const assessment = (
        synthetic.payload as { websiteModel: { sources: { assessment: IJourneyCampaign }[] } }
      ).websiteModel.sources[0]!.assessment;
      const journeyId = scope === 'pending' ? 'recovered' : 'initialize';
      assessment.definitions = assessment.definitions.filter(({ id }) => id === journeyId);
      assessment.bundle.journeys = assessment.bundle.journeys.filter(({ id }) => id === journeyId);
      if (scope !== 'full') assessment.platforms = assessment.platforms.slice(0, 1);
      for (const provider of assessment.platforms) {
        provider.trials = provider.trials.filter((trial) => trial.kind === 'initial');
        for (const trial of provider.trials) {
          trial.selectedJourneys = [journeyId];
          trial.journeys = trial.journeys.filter(({ id }) => id === journeyId);
          trial.restartCounts = { [journeyId]: 0 };
        }
        provider.resolutions = resolveJourneyTrials(provider.trials);
      }
      assessment.status = deriveCampaignStatus(assessment.platforms.flatMap((p) => p.resolutions));
      const projected = createJourneysEvidenceBundle({
        assessment,
        definitions: assessment.definitions,
        skill: assessment.bundle.skill,
        instructions: assessment.bundle.instructions,
        artifacts: synthetic.artifacts.files
          .filter(({ path: artifactPath }) => artifactPath.split('/')[1] === journeyId)
          .map((artifact) => ({
            path: artifact.path,
            mediaType: artifact.mediaType,
            content: Buffer.from(
              synthetic.artifacts.blobs.find((blob) => blob.sha256 === artifact.sha256)!
                .contentBase64,
              'base64',
            ),
          })),
      });
      expect(projected.run.status).toBe(scope === 'full' ? 'passed' : 'incomplete');
      const encoded = encodeEvidenceBundle(projected);
      const journeys = createAsset('journeys', 'campaign');
      journeys.encoded = encoded;
      journeys.reference.sha256 = calculateSha256(encoded);
      const semantic = createAsset('semantic', 'campaign');
      const selectionPath = path.join(root, 'selection.json');
      await writeJsonFile(selectionPath, {
        formatVersion: 1,
        semantic: semantic.reference,
        journeys: journeys.reference,
      } satisfies IEvidenceSelection);
      const options = {
        selectionPath,
        cacheDirectory: path.join(root, 'cache'),
        preparedDirectory: path.join(root, 'prepared'),
        downloadAsset: async (reference: IEvidenceSelectionReference, destination: string) => {
          await writeFileAtomic(
            destination,
            reference.assetName === semantic.reference.assetName ? semantic.encoded : encoded,
          );
        },
      };
      const prepared = await prepareSelectedEvidence(options);
      expect(prepared.journeys?.bundleSha256).toBe(journeys.reference.sha256);
      if (scope === 'full')
        await expect(verifyPreparedReleaseEvidence(options)).resolves.toStrictEqual(prepared);
      else
        await expect(verifyPreparedReleaseEvidence(options)).rejects.toThrow(
          'Release assurance requires passing official journeys evidence.',
        );
    },
  );

  test.each(['passed', 'failed', 'incomplete'] as const)(
    'verifies selected journeys with outcome %s',
    async (status) => {
      const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-journeys-'));
      temporaryRoots.push(root);
      const semantic = createAsset('semantic', 'a');
      const journeys = createAsset('journeys', 'a', 'official', status);
      const selectionPath = path.join(root, 'selection.json');
      await writeJsonFile(selectionPath, {
        formatVersion: 1,
        semantic: semantic.reference,
        journeys: journeys.reference,
      } satisfies IEvidenceSelection);
      const assets = new Map(
        [semantic, journeys].map((asset) => [asset.reference.assetName, asset.encoded]),
      );
      const options = {
        selectionPath,
        cacheDirectory: path.join(root, 'cache'),
        preparedDirectory: path.join(root, 'prepared'),
        downloadAsset: async (reference: IEvidenceSelectionReference, destination: string) => {
          const bytes = assets.get(reference.assetName);
          if (!bytes) throw new Error('Missing test asset.');
          await writeFileAtomic(destination, bytes);
        },
      };
      const manifest = await prepareSelectedEvidence(options);
      expect(manifest.journeys?.bundleSha256).toBe(journeys.reference.sha256);
      if (status === 'passed') {
        await expect(verifyPreparedReleaseEvidence(options)).resolves.toStrictEqual(manifest);
        await writeJsonFile(path.join(options.preparedDirectory, 'manifest.json'), {
          ...manifest,
          journeys: null,
        });
        await expect(verifyPreparedReleaseEvidence(options)).rejects.toThrow('selection presence');
        await writeJsonFile(path.join(options.preparedDirectory, 'manifest.json'), manifest);
        if (!manifest.journeys) throw new Error('Missing journeys section.');
        await expect(
          readFile(
            path.join(
              options.preparedDirectory,
              manifest.journeys.assetsPath,
              'projects/journeys-a.txt',
            ),
            'utf8',
          ),
        ).resolves.toBe('journeys-a\n');
        await writeJsonFile(selectionPath, {
          formatVersion: 1,
          semantic: semantic.reference,
          journeys: null,
        });
        const semanticOnly = await prepareSelectedEvidence(options);
        expect(semanticOnly.journeys).toBeNull();
        await expect(verifyPreparedReleaseEvidence(options)).resolves.toStrictEqual(semanticOnly);
        expect(await readdir(options.cacheDirectory)).toStrictEqual([
          `${semantic.reference.sha256}.json.gz`,
        ]);
      } else {
        await expect(verifyPreparedReleaseEvidence(options)).rejects.toThrow(
          'Release assurance requires passing official journeys evidence.',
        );
      }
    },
  );

  test('requires semantic evidence even when journeys are selected', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-journeys-'));
    temporaryRoots.push(root);
    const selectionPath = path.join(root, 'selection.json');
    await writeJsonFile(selectionPath, {
      formatVersion: 1,
      semantic: null,
      journeys: createAsset('journeys', 'a').reference,
    });
    await expect(
      prepareSelectedEvidence({
        selectionPath,
        cacheDirectory: path.join(root, 'cache'),
        preparedDirectory: path.join(root, 'prepared'),
      }),
    ).rejects.toThrow('Select a semantic bundle first.');
  });

  test('downloads a public asset through bounded HTTP without GitHub credentials', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-http-'));
    temporaryRoots.push(root);
    const content = Buffer.from('public evidence bundle');
    const server = createServer((_request, response) => {
      response.writeHead(200, {
        'content-length': content.byteLength,
        'content-type': 'application/gzip',
      });
      response.end(content);
    });
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.once('error', rejectPromise);
      server.listen(0, '127.0.0.1', resolvePromise);
    });

    try {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Test HTTP server did not expose a TCP address.');
      }
      const destinationPath = path.join(root, 'downloaded.json.gz');
      await downloadHttpEvidenceAsset(
        new URL(`http://127.0.0.1:${address.port}/evidence.json.gz`),
        destinationPath,
      );
      await expect(readFile(destinationPath)).resolves.toStrictEqual(content);
    } finally {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error === undefined) resolvePromise();
          else rejectPromise(error);
        });
      });
    }
  });

  test('prepares an exact selection, reuses cache, and removes stale bundles', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-preparation-'));
    temporaryRoots.push(root);
    const assetsDirectory = path.join(root, 'assets');
    const selectionPath = path.join(root, 'selection.json');
    const semanticA = createAsset('semantic', 'a');
    const semanticB = createAsset('semantic', 'b');
    for (const asset of [semanticA, semanticB]) {
      await writeFileAtomic(path.join(assetsDirectory, asset.reference.assetName), asset.encoded);
    }
    await writeJsonFile(selectionPath, {
      formatVersion: 1,
      journeys: null,
      semantic: semanticA.reference,
    } satisfies IEvidenceSelection);
    let downloadCount = 0;
    const downloadAsset: IDownloadEvidenceAsset = async (reference, destinationPath) => {
      downloadCount += 1;
      await cp(path.join(assetsDirectory, reference.assetName), destinationPath);
    };
    const options = {
      cacheDirectory: path.join(root, 'cache'),
      downloadAsset,
      preparedDirectory: path.join(root, 'prepared'),
      selectionPath,
    };

    await prepareSelectedEvidence(options);
    const firstManifest = await prepareSelectedEvidence(options);
    expect(firstManifest.journeys).toBeNull();
    await expect(verifyPreparedReleaseEvidence(options)).resolves.toStrictEqual(firstManifest);
    expect(downloadCount).toBe(1);
    expect(
      JSON.parse(await readFile(path.join(root, 'prepared', firstManifest.semantic.path), 'utf8')),
    ).toMatchObject({ payload: { cases: [{ id: 'semantic-a' }] } });
    await expect(
      readFile(
        path.join(
          root,
          'prepared',
          firstManifest.semantic.assetsPath,
          'projects',
          'semantic-a.txt',
        ),
        'utf8',
      ),
    ).resolves.toBe('semantic-a\n');

    await updateEvidenceSelection(selectionPath, 'semantic', semanticB.reference);
    const secondManifest = await prepareSelectedEvidence(options);
    expect(downloadCount).toBe(2);
    expect(
      JSON.parse(await readFile(path.join(root, 'prepared', secondManifest.semantic.path), 'utf8')),
    ).toMatchObject({ payload: { cases: [{ id: 'semantic-b' }] } });
    expect((await readdir(path.join(root, 'cache'))).sort()).toStrictEqual(
      [semanticB.reference.sha256].map((sha256) => `${sha256}.json.gz`).sort(),
    );
  });

  test('keeps the previous complete snapshot visible when replacement preparation fails', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-preparation-'));
    temporaryRoots.push(root);
    const selectionPath = path.join(root, 'selection.json');
    const semanticA = createAsset('semantic', 'a');
    const semanticB = createAsset('semantic', 'b');
    const assetByName = new Map([
      [semanticA.reference.assetName, semanticA.encoded],
      [semanticB.reference.assetName, semanticB.encoded],
    ]);
    await writeJsonFile(selectionPath, {
      formatVersion: 1,
      journeys: null,
      semantic: semanticA.reference,
    } satisfies IEvidenceSelection);
    const options = {
      cacheDirectory: path.join(root, 'cache'),
      downloadAsset: async (reference: IEvidenceSelectionReference, destinationPath: string) => {
        const content = assetByName.get(reference.assetName);
        if (content === undefined) throw new Error('Missing test asset.');
        await writeFileAtomic(destinationPath, content);
      },
      preparedDirectory: path.join(root, 'prepared'),
      selectionPath,
    };
    const firstManifest = await prepareSelectedEvidence(options);
    const originalManifestSource = await readFile(
      path.join(root, 'prepared', 'manifest.json'),
      'utf8',
    );

    await updateEvidenceSelection(selectionPath, 'semantic', semanticB.reference);
    await expect(
      prepareSelectedEvidence({
        ...options,
        downloadAsset: async (reference, destinationPath) => {
          if (reference.assetName === semanticB.reference.assetName) {
            await writeFileAtomic(destinationPath, Buffer.from('corrupt'));
            return;
          }
          await options.downloadAsset(reference, destinationPath);
        },
      }),
    ).rejects.toThrow(/digest does not match/u);

    await expect(readFile(path.join(root, 'prepared', 'manifest.json'), 'utf8')).resolves.toBe(
      originalManifestSource,
    );
    await expect(
      readFile(path.join(root, 'prepared', firstManifest.semantic.path), 'utf8'),
    ).resolves.toContain('semantic-a');
  });

  test('does not expose a manifest after a digest failure', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-preparation-'));
    temporaryRoots.push(root);
    const selectionPath = path.join(root, 'selection.json');
    const semantic = createAsset('semantic', 'a');
    await writeJsonFile(selectionPath, {
      formatVersion: 1,
      journeys: null,
      semantic: semantic.reference,
    } satisfies IEvidenceSelection);

    await expect(
      prepareSelectedEvidence({
        cacheDirectory: path.join(root, 'cache'),
        downloadAsset: async (_reference, destinationPath) => {
          await writeFileAtomic(destinationPath, Buffer.from('changed'));
        },
        preparedDirectory: path.join(root, 'prepared'),
        selectionPath,
      }),
    ).rejects.toThrow(/digest does not match/u);
    await expect(readFile(path.join(root, 'prepared', 'manifest.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  test.each(['semantic', 'journeys'] as const)(
    'rejects %s fixture bundles in production preparation',
    async (kind) => {
      const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-preparation-'));
      temporaryRoots.push(root);
      const selectionPath = path.join(root, 'selection.json');
      const semanticFixture = createAsset(kind, 'fixture', 'fixture');
      const semantic = createAsset('semantic', 'a');
      await writeJsonFile(selectionPath, {
        formatVersion: 1,
        journeys: kind === 'journeys' ? semanticFixture.reference : null,
        semantic: kind === 'semantic' ? semanticFixture.reference : semantic.reference,
      } satisfies IEvidenceSelection);
      const assetByName = new Map(
        [semanticFixture, semantic].map((asset) => [asset.reference.assetName, asset.encoded]),
      );

      await expect(
        prepareSelectedEvidence({
          cacheDirectory: path.join(root, 'cache'),
          downloadAsset: async (reference, destinationPath) => {
            const content = assetByName.get(reference.assetName);
            if (content === undefined) throw new Error('Missing test asset.');
            await writeFileAtomic(destinationPath, content);
          },
          preparedDirectory: path.join(root, 'prepared'),
          selectionPath,
        }),
      ).rejects.toThrow(`not an official ${kind} bundle`);
    },
  );
});
