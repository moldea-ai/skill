import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  calculateSha256,
  ensureDirectory,
  writeBufferFileAtomically,
} from '../filesystem/index.ts';
import { encodeEvidenceBundle, validateEvidenceBundle } from '../evidence/index.ts';
import { createGitHubReleaseClient } from './github.ts';
import type {
  IGitHubReleaseClient,
  IPublishEvidenceBundleOptions,
  IPublishedEvidenceBundle,
} from './types.ts';

const createAssetName = (kind: string, attemptId: string): string => {
  const normalizedAttemptId = attemptId.toLocaleLowerCase('en-US');
  if (!/^[a-z0-9][a-z0-9._-]{0,55}$/u.test(normalizedAttemptId)) {
    throw new Error('Evidence attempt id cannot form a portable release asset name.');
  }
  return `${kind}-${normalizedAttemptId}.json.gz`;
};

const publishOnce = async (
  client: IGitHubReleaseClient,
  options: Omit<IPublishEvidenceBundleOptions, 'client'>,
): Promise<IPublishedEvidenceBundle> => {
  const bundle = validateEvidenceBundle(options.bundle);
  if (bundle.classification !== 'official') {
    throw new Error('Fixture evidence cannot be published as an official release asset.');
  }
  if (!/^evidence-[a-z0-9][a-z0-9._-]{0,119}$/u.test(options.tag)) {
    throw new Error('Evidence release tag must start with evidence- and use portable characters.');
  }
  const assetName = createAssetName(bundle.kind, bundle.run.attemptId);
  const tag = options.tag;
  const compressed = encodeEvidenceBundle(bundle);
  const sha256 = calculateSha256(compressed);
  await ensureDirectory(options.temporaryDirectory);
  const assetPath = path.join(options.temporaryDirectory, assetName);
  await writeBufferFileAtomically(assetPath, compressed);

  try {
    let release = await client.getRelease(options.repository, tag);
    if (release === null) {
      await client.createDraft({
        notes: `Recorded ${bundle.kind} evidence for ${bundle.run.version}.`,
        repository: options.repository,
        tag,
        title: `${bundle.kind} evidence ${bundle.run.attemptId}`,
      });
      release = await client.getRelease(options.repository, tag);
      if (release === null || !release.isDraft) {
        throw new Error('GitHub did not expose the newly created draft evidence release.');
      }
    }

    const existingAsset = release.assets.find(({ name }) => name === assetName);
    if (existingAsset !== undefined) {
      const existingAssetPath = path.join(options.temporaryDirectory, `existing-${assetName}`);
      try {
        await client.downloadAsset({
          assetName,
          destinationPath: existingAssetPath,
          repository: options.repository,
          tag,
        });
        if (calculateSha256(await readFile(existingAssetPath)) !== sha256) {
          const error = new Error(
            `Evidence release ${tag} already contains a conflicting ${assetName} asset.`,
          );
          error.name = 'EvidenceReleaseConflictError';
          throw error;
        }
      } finally {
        await rm(existingAssetPath, { force: true });
      }
    } else {
      if (!release.isDraft) {
        const error = new Error(`Published evidence release ${tag} is missing ${assetName}.`);
        error.name = 'EvidenceReleaseConflictError';
        throw error;
      }
      await client.uploadAsset({ assetPath, repository: options.repository, tag });
    }

    if (release.isDraft) await client.publishDraft(options.repository, tag);
    return { assetName, kind: bundle.kind, repository: options.repository, sha256, tag };
  } finally {
    await rm(assetPath, { force: true });
  }
};

/**
 * Publishes one official bundle through a draft, upload, and publish sequence.
 * Safe retries re-inspect the release and accept only an exact existing asset.
 */
export const publishEvidenceBundle = async (
  options: IPublishEvidenceBundleOptions,
): Promise<IPublishedEvidenceBundle> => {
  const bundle = validateEvidenceBundle(options.bundle);
  if (bundle.classification !== 'official') {
    throw new Error('Fixture evidence cannot be published as an official release asset.');
  }
  const client = options.client ?? createGitHubReleaseClient();
  let firstError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await publishOnce(client, { ...options, bundle });
    } catch (error) {
      if (error instanceof Error && error.name === 'EvidenceReleaseConflictError') throw error;
      firstError ??= error;
    }
  }
  throw new AggregateError(
    [firstError],
    'Evidence publication did not complete after one conflict-safe retry.',
  );
};
