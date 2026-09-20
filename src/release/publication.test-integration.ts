// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { writeBufferFileAtomically, writeJsonFileAtomically } from '../filesystem/index.ts';
import {
  createEvidenceBundle,
  type IEvidenceSelection,
  type IEvidenceSelectionReference,
} from '../evidence/index.ts';
import { pinEvidenceReleaseAsset } from './pinning.ts';
import { publishEvidenceBundle } from './publication.ts';
import type { IGitHubRelease, IGitHubReleaseClient } from './types.ts';

class FakeGitHubReleaseClient implements IGitHubReleaseClient {
  public readonly assets = new Map<string, Buffer>();
  public readonly events: string[] = [];
  public release: IGitHubRelease | null = null;
  public uploadFailureCount = 0;

  public async createDraft(options: {
    notes: string;
    repository: string;
    tag: string;
    title: string;
  }): Promise<void> {
    this.events.push('create-draft');
    this.release = { assets: [], isDraft: true, tag: options.tag };
  }

  public async downloadAsset(options: {
    assetName: string;
    destinationPath: string;
    repository: string;
    tag: string;
  }): Promise<void> {
    this.events.push('download');
    const content = this.assets.get(options.assetName);
    if (content === undefined) throw new Error('Missing fake GitHub asset.');
    await writeBufferFileAtomically(options.destinationPath, content);
  }

  public async getRelease(_repository: string, _tag: string): Promise<IGitHubRelease | null> {
    this.events.push('view');
    return this.release === null ? null : structuredClone(this.release);
  }

  public async publishDraft(_repository: string, _tag: string): Promise<void> {
    this.events.push('publish');
    if (this.release === null) throw new Error('Missing fake release.');
    this.release.isDraft = false;
  }

  public async uploadAsset(options: {
    assetPath: string;
    repository: string;
    tag: string;
  }): Promise<void> {
    this.events.push('upload');
    const name = path.basename(options.assetPath);
    const content = await readFile(options.assetPath);
    this.assets.set(name, content);
    if (this.release === null) throw new Error('Missing fake release.');
    this.release.assets = [{ name, size: content.byteLength }];
    if (this.uploadFailureCount > 0) {
      this.uploadFailureCount -= 1;
      throw new Error('Simulated interrupted upload response.');
    }
  }
}

const temporaryRoots: string[] = [];

const createOfficialBundle = () =>
  createEvidenceBundle({
    classification: 'official',
    kind: 'semantic',
    payload: { cases: [{ id: 'semantic-one' }] },
    run: {
      attemptId: 'attempt-1',
      evaluatedAt: '2026-09-19T12:00:00.000Z',
      provenance: {},
      status: 'passed',
      version: '5.0.9',
    },
  });

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('GitHub evidence release assets', () => {
  test('recovers from a partial upload without clobbering the exact asset', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-release-evidence-'));
    temporaryRoots.push(root);
    const client = new FakeGitHubReleaseClient();
    client.uploadFailureCount = 1;

    const result = await publishEvidenceBundle({
      bundle: createOfficialBundle(),
      client,
      repository: 'moldea-ai/skill',
      tag: 'evidence-semantic-attempt-1',
      temporaryDirectory: root,
    });

    expect(result.assetName).toBe('semantic-attempt-1.json.gz');
    expect(client.events).toStrictEqual([
      'view',
      'create-draft',
      'view',
      'upload',
      'view',
      'download',
      'publish',
    ]);
    expect(client.release?.isDraft).toBe(false);
  });

  test('rejects a conflicting existing asset', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-release-evidence-'));
    temporaryRoots.push(root);
    const client = new FakeGitHubReleaseClient();
    client.release = {
      assets: [{ name: 'semantic-attempt-1.json.gz', size: 7 }],
      isDraft: true,
      tag: 'evidence-semantic-attempt-1',
    };
    client.assets.set('semantic-attempt-1.json.gz', Buffer.from('changed'));

    await expect(
      publishEvidenceBundle({
        bundle: createOfficialBundle(),
        client,
        repository: 'moldea-ai/skill',
        tag: 'evidence-semantic-attempt-1',
        temporaryDirectory: root,
      }),
    ).rejects.toMatchObject({ name: 'EvidenceReleaseConflictError' });
    expect(client.events).not.toContain('upload');
  });

  test('rejects fixture publication', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-release-evidence-'));
    temporaryRoots.push(root);
    await expect(
      publishEvidenceBundle({
        bundle: createEvidenceBundle({
          classification: 'fixture',
          kind: 'semantic',
          payload: {},
          run: {
            attemptId: 'fixture-1',
            evaluatedAt: '2026-09-19T12:00:00.000Z',
            provenance: {},
            status: 'passed',
            version: 'test',
          },
        }),
        client: new FakeGitHubReleaseClient(),
        repository: 'moldea-ai/skill',
        tag: 'evidence-semantic-fixture-1',
        temporaryDirectory: root,
      }),
    ).rejects.toThrow(/Fixture evidence cannot be published/u);
  });

  test('publishes failed official evidence for honest selected-run display', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-release-evidence-'));
    temporaryRoots.push(root);
    const failedBundle = createOfficialBundle();
    failedBundle.run.status = 'failed';

    await expect(
      publishEvidenceBundle({
        bundle: failedBundle,
        client: new FakeGitHubReleaseClient(),
        repository: 'moldea-ai/skill',
        tag: 'evidence-semantic-attempt-1',
        temporaryDirectory: root,
      }),
    ).resolves.toMatchObject({ kind: 'semantic' });
  });

  test('pins one validated bundle without changing the other selection', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-release-evidence-'));
    temporaryRoots.push(root);
    const client = new FakeGitHubReleaseClient();
    const published = await publishEvidenceBundle({
      bundle: createOfficialBundle(),
      client,
      repository: 'moldea-ai/skill',
      tag: 'evidence-semantic-attempt-1',
      temporaryDirectory: root,
    });
    const selectionPath = path.join(root, 'selection.json');
    const qualificationReference: IEvidenceSelectionReference = {
      assetName: 'qualification-existing.json.gz',
      classification: 'official',
      repository: 'moldea-ai/skill',
      sha256: 'a'.repeat(64),
      tag: 'evidence-qualification-existing',
    };
    await writeJsonFileAtomically(selectionPath, {
      formatVersion: 1,
      qualification: qualificationReference,
      semantic: null,
    } satisfies IEvidenceSelection);
    const semanticReference: IEvidenceSelectionReference = {
      assetName: published.assetName,
      classification: 'official',
      repository: published.repository,
      sha256: published.sha256,
      tag: published.tag,
    };

    const selection = await pinEvidenceReleaseAsset({
      assetName: semanticReference.assetName,
      client,
      kind: 'semantic',
      release: semanticReference.tag,
      selectionPath,
    });

    expect(selection.qualification).toStrictEqual(qualificationReference);
    expect(selection.semantic).toStrictEqual(semanticReference);
  });

  test('rejects an asset while its evidence release is still a draft', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-release-evidence-'));
    temporaryRoots.push(root);
    const client = new FakeGitHubReleaseClient();
    client.release = {
      assets: [{ name: 'semantic-attempt-1.json.gz', size: 1 }],
      isDraft: true,
      tag: 'evidence-semantic-attempt-1',
    };
    const selectionPath = path.join(root, 'selection.json');
    await writeJsonFileAtomically(selectionPath, {
      formatVersion: 1,
      qualification: null,
      semantic: null,
    } satisfies IEvidenceSelection);

    await expect(
      pinEvidenceReleaseAsset({
        assetName: 'semantic-attempt-1.json.gz',
        client,
        kind: 'semantic',
        release: 'evidence-semantic-attempt-1',
        selectionPath,
      }),
    ).rejects.toThrow(/existing published release/u);
    expect(client.events).toStrictEqual(['view']);
  });

  test('allows a failed official bundle to be selected for honest display', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-release-evidence-'));
    temporaryRoots.push(root);
    const client = new FakeGitHubReleaseClient();
    const failedBundle = createOfficialBundle();
    failedBundle.run.status = 'failed';
    const published = await publishEvidenceBundle({
      bundle: failedBundle,
      client,
      repository: 'moldea-ai/skill',
      tag: 'evidence-semantic-attempt-1',
      temporaryDirectory: root,
    });
    const selectionPath = path.join(root, 'selection.json');
    await writeJsonFileAtomically(selectionPath, {
      formatVersion: 1,
      qualification: null,
      semantic: null,
    } satisfies IEvidenceSelection);

    await expect(
      pinEvidenceReleaseAsset({
        assetName: published.assetName,
        client,
        kind: 'semantic',
        release: published.tag,
        selectionPath,
      }),
    ).resolves.toMatchObject({ semantic: { sha256: published.sha256 } });
  });
});
