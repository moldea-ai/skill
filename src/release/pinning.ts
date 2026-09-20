import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { calculateSha256 } from '../filesystem/index.ts';
import {
  decodeEvidenceBundle,
  EVIDENCE_RELEASE_REPOSITORY,
  updateEvidenceSelection,
  type IEvidenceKind,
  type IEvidenceSelection,
  type IEvidenceSelectionReference,
} from '../evidence/index.ts';
import { createGitHubReleaseClient } from './github.ts';
import type { IGitHubReleaseClient } from './types.ts';

export type IPinEvidenceReleaseAssetOptions = {
  client?: IGitHubReleaseClient;
  assetName: string;
  kind: IEvidenceKind;
  release: string;
  selectionPath: string;
};

/**
 * Validates an exact official release asset before atomically selecting it for one section.
 * @returns The complete updated independent evidence selection.
 */
export const pinEvidenceReleaseAsset = async (
  options: IPinEvidenceReleaseAssetOptions,
): Promise<IEvidenceSelection> => {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}\.json\.gz$/u.test(options.assetName)) {
    throw new Error('Evidence asset name must be a portable JSON gzip filename.');
  }
  if (!/^evidence-[a-z0-9][a-z0-9._-]{0,119}$/u.test(options.release)) {
    throw new Error('Evidence release tag must start with evidence- and use portable characters.');
  }
  const client = options.client ?? createGitHubReleaseClient();
  const release = await client.getRelease(EVIDENCE_RELEASE_REPOSITORY, options.release);
  if (release === null || release.isDraft) {
    throw new Error('Evidence selection requires an existing published release.');
  }
  if (!release.assets.some(({ name }) => name === options.assetName)) {
    throw new Error(`Evidence release ${options.release} does not contain ${options.assetName}.`);
  }
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-pin-'));
  const assetPath = path.join(temporaryDirectory, options.assetName);
  try {
    await client.downloadAsset({
      assetName: options.assetName,
      destinationPath: assetPath,
      repository: EVIDENCE_RELEASE_REPOSITORY,
      tag: options.release,
    });
    const compressed = await readFile(assetPath);
    const sha256 = calculateSha256(compressed);
    const bundle = decodeEvidenceBundle(compressed);
    if (bundle.kind !== options.kind || bundle.classification !== 'official') {
      throw new Error(`Pinned evidence asset is not an official ${options.kind} bundle.`);
    }
    const reference: IEvidenceSelectionReference = {
      assetName: options.assetName,
      classification: 'official',
      repository: EVIDENCE_RELEASE_REPOSITORY,
      sha256,
      tag: options.release,
    };
    return updateEvidenceSelection(options.selectionPath, options.kind, reference);
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
};
