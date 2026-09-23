// @vitest-environment node
import { cp, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  calculateSha256,
  writeBufferFileAtomically,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import { createEvidenceBundle, encodeEvidenceBundle } from './bundle.ts';
import {
  downloadHttpEvidenceAsset,
  prepareSelectedEvidence,
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
        status: 'passed',
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

  test('prepares independent exact selections, reuses cache, and removes stale bundles', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-preparation-'));
    temporaryRoots.push(root);
    const assetsDirectory = path.join(root, 'assets');
    const selectionPath = path.join(root, 'selection.json');
    const semanticA = createAsset('semantic', 'a');
    const semanticB = createAsset('semantic', 'b');
    const qualificationA = createAsset('qualification', 'a');
    for (const asset of [semanticA, semanticB, qualificationA]) {
      await writeBufferFileAtomically(
        path.join(assetsDirectory, asset.reference.assetName),
        asset.encoded,
      );
    }
    await writeJsonFileAtomically(selectionPath, {
      formatVersion: 1,
      qualification: qualificationA.reference,
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
    expect(downloadCount).toBe(2);
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
    expect(downloadCount).toBe(3);
    expect(
      JSON.parse(await readFile(path.join(root, 'prepared', secondManifest.semantic.path), 'utf8')),
    ).toMatchObject({ payload: { cases: [{ id: 'semantic-b' }] } });
    expect((await readdir(path.join(root, 'cache'))).sort()).toStrictEqual(
      [qualificationA.reference.sha256, semanticB.reference.sha256]
        .map((sha256) => `${sha256}.json.gz`)
        .sort(),
    );
  });

  test('keeps the previous complete snapshot visible when replacement preparation fails', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-preparation-'));
    temporaryRoots.push(root);
    const selectionPath = path.join(root, 'selection.json');
    const semanticA = createAsset('semantic', 'a');
    const semanticB = createAsset('semantic', 'b');
    const qualification = createAsset('qualification', 'a');
    const assetByName = new Map([
      [semanticA.reference.assetName, semanticA.encoded],
      [semanticB.reference.assetName, semanticB.encoded],
      [qualification.reference.assetName, qualification.encoded],
    ]);
    await writeJsonFileAtomically(selectionPath, {
      formatVersion: 1,
      qualification: qualification.reference,
      semantic: semanticA.reference,
    } satisfies IEvidenceSelection);
    const options = {
      cacheDirectory: path.join(root, 'cache'),
      downloadAsset: async (reference: IEvidenceSelectionReference, destinationPath: string) => {
        const content = assetByName.get(reference.assetName);
        if (content === undefined) throw new Error('Missing test asset.');
        await writeBufferFileAtomically(destinationPath, content);
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
            await writeBufferFileAtomically(destinationPath, Buffer.from('corrupt'));
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
    const qualification = createAsset('qualification', 'a');
    await writeJsonFileAtomically(selectionPath, {
      formatVersion: 1,
      qualification: qualification.reference,
      semantic: semantic.reference,
    } satisfies IEvidenceSelection);

    await expect(
      prepareSelectedEvidence({
        cacheDirectory: path.join(root, 'cache'),
        downloadAsset: async (_reference, destinationPath) => {
          await writeBufferFileAtomically(destinationPath, Buffer.from('changed'));
        },
        preparedDirectory: path.join(root, 'prepared'),
        selectionPath,
      }),
    ).rejects.toThrow(/digest does not match/u);
    await expect(readFile(path.join(root, 'prepared', 'manifest.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  test('rejects fixture bundles in production preparation', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-preparation-'));
    temporaryRoots.push(root);
    const selectionPath = path.join(root, 'selection.json');
    const semanticFixture = createAsset('semantic', 'fixture', 'fixture');
    const qualification = createAsset('qualification', 'a');
    await writeJsonFileAtomically(selectionPath, {
      formatVersion: 1,
      qualification: qualification.reference,
      semantic: semanticFixture.reference,
    } satisfies IEvidenceSelection);
    const assetByName = new Map([
      [semanticFixture.reference.assetName, semanticFixture.encoded],
      [qualification.reference.assetName, qualification.encoded],
    ]);

    await expect(
      prepareSelectedEvidence({
        cacheDirectory: path.join(root, 'cache'),
        downloadAsset: async (reference, destinationPath) => {
          const content = assetByName.get(reference.assetName);
          if (content === undefined) throw new Error('Missing test asset.');
          await writeBufferFileAtomically(destinationPath, content);
        },
        preparedDirectory: path.join(root, 'prepared'),
        selectionPath,
      }),
    ).rejects.toThrow(/not an official semantic bundle/u);
  });
});
