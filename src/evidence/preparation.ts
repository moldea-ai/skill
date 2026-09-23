import { randomUUID } from 'node:crypto';
import { readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  calculateSha256,
  ensureDirectory,
  readJsonFile,
  resolveContainedPath,
  writeBufferFileAtomically,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import { decodeEvidenceBundle, validateEvidenceBundle } from './bundle.ts';
import { EVIDENCE_RELEASE_REPOSITORY, MAXIMUM_EVIDENCE_BUNDLE_BYTES } from './constants.ts';
import {
  EvidenceSelectionSchema,
  EvidencePreparationManifestSchema,
  type IEvidenceBundle,
  type IEvidenceKind,
  type IEvidencePreparationManifest,
  type IEvidenceSelectionReference,
} from './types.ts';

export type IDownloadEvidenceAsset = (
  reference: IEvidenceSelectionReference,
  destinationPath: string,
  signal?: AbortSignal,
) => Promise<void>;

export type IPrepareEvidenceOptions = {
  cacheDirectory: string;
  downloadAsset?: IDownloadEvidenceAsset;
  preparedDirectory: string;
  selectionPath: string;
  signal?: AbortSignal;
};

/** Downloads one bounded evidence asset from an HTTP endpoint. */
export const downloadHttpEvidenceAsset = async (
  url: URL,
  destinationPath: string,
  signal?: AbortSignal,
): Promise<void> => {
  const timeoutSignal = AbortSignal.timeout(120_000);
  const executionSignal =
    signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
  const response = await fetch(url, { redirect: 'follow', signal: executionSignal });
  if (!response.ok) {
    throw new Error(`Evidence asset download failed with HTTP ${response.status}.`);
  }
  const responseBody = response.body as ReadableStream<Uint8Array> | null;
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
    await responseBody?.cancel();
    throw new Error(`Evidence asset exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} compressed bytes.`);
  }
  if (responseBody === null) throw new Error('Evidence asset download returned no response body.');

  const chunks: Uint8Array[] = [];
  let byteCount = 0;
  const reader = responseBody.getReader();
  while (true) {
    const { done, value: chunk } = await reader.read();
    if (done) break;
    byteCount += chunk.byteLength;
    if (byteCount > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
      await reader.cancel();
      throw new Error(`Evidence asset exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} compressed bytes.`);
    }
    chunks.push(chunk);
  }
  await writeBufferFileAtomically(destinationPath, Buffer.concat(chunks, byteCount));
};

/** Downloads one exact public GitHub Release asset without publication credentials. */
export const downloadGitHubEvidenceAsset: IDownloadEvidenceAsset = async (
  reference,
  destinationPath,
  signal,
) => {
  const assetUrl = new URL(
    `https://github.com/${EVIDENCE_RELEASE_REPOSITORY}/releases/download/` +
      `${encodeURIComponent(reference.tag)}/${encodeURIComponent(reference.assetName)}`,
  );
  await downloadHttpEvidenceAsset(assetUrl, destinationPath, signal);
};

const readBoundedBundleFile = async (filePath: string): Promise<Buffer> => {
  const statistics = await stat(filePath);
  if (!statistics.isFile() || statistics.size > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
    throw new Error(`Evidence asset exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} compressed bytes.`);
  }
  const content = await readFile(filePath);
  if (content.byteLength > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
    throw new Error(`Evidence asset exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} compressed bytes.`);
  }
  return content;
};

const getCachedBundle = async (
  kind: IEvidenceKind,
  reference: IEvidenceSelectionReference,
  options: IPrepareEvidenceOptions,
): Promise<{ bundle: IEvidenceBundle; cachePath: string }> => {
  const cachePath = path.join(options.cacheDirectory, `${reference.sha256}.json.gz`);
  let compressed: Buffer | undefined;
  try {
    compressed = await readBoundedBundleFile(cachePath);
    if (calculateSha256(compressed) !== reference.sha256) {
      throw new Error('Cached evidence asset digest does not match its selection.');
    }
  } catch (error) {
    compressed = undefined;
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      await rm(cachePath, { force: true });
    }
  }

  if (compressed === undefined) {
    const temporaryPath = path.join(
      options.cacheDirectory,
      `${kind}-${process.pid}-${randomUUID()}.download`,
    );
    await ensureDirectory(options.cacheDirectory);
    try {
      await (options.downloadAsset ?? downloadGitHubEvidenceAsset)(
        reference,
        temporaryPath,
        options.signal,
      );
      compressed = await readBoundedBundleFile(temporaryPath);
      if (calculateSha256(compressed) !== reference.sha256) {
        throw new Error(`Downloaded ${kind} evidence digest does not match its selection.`);
      }
      await writeBufferFileAtomically(cachePath, compressed);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  const bundle = decodeEvidenceBundle(compressed);
  if (bundle.kind !== kind || bundle.classification !== 'official') {
    throw new Error(`Selected ${kind} evidence is not an official ${kind} bundle.`);
  }
  return { bundle, cachePath };
};

/**
 * Resolves both exact selected bundles and exposes an atomic prepared manifest.
 * @param options Selection, cache, output, download, and cancellation controls.
 * @returns The manifest tied to the exact successfully prepared selection.
 */
export const prepareSelectedEvidence = async (
  options: IPrepareEvidenceOptions,
): Promise<IEvidencePreparationManifest> => {
  const selection = await readJsonFile(options.selectionPath, EvidenceSelectionSchema);
  if (selection.semantic === null || selection.qualification === null) {
    throw new Error(
      'Production evidence is unselected. Select both semantic and qualification bundles first.',
    );
  }

  const selectionSource = `${JSON.stringify(selection)}\n`;
  const selectionSha256 = calculateSha256(selectionSource);
  const snapshotName = `${selectionSha256.slice(0, 32)}-${randomUUID().slice(0, 16)}`;
  const snapshotRelativePath = path.posix.join('snapshots', snapshotName);
  const snapshotDirectory = path.join(options.preparedDirectory, 'snapshots', snapshotName);
  const stagingDirectory = path.join(
    options.preparedDirectory,
    'staging',
    `${snapshotName}-${process.pid}-${randomUUID()}`,
  );
  await ensureDirectory(stagingDirectory);
  const prepared: Partial<
    Record<
      IEvidenceKind,
      {
        assetsPath: string;
        bundleSha256: string;
        path: string;
        preparedSha256: string;
      }
    >
  > = {};
  const selectedCachePaths = new Set<string>();
  try {
    for (const kind of ['semantic', 'qualification'] as const) {
      if (options.signal?.aborted === true) throw new Error('Evidence preparation was aborted.');
      const reference = selection[kind];
      if (reference === null) throw new Error(`Selected ${kind} evidence is missing.`);
      const { bundle, cachePath } = await getCachedBundle(kind, reference, options);
      selectedCachePaths.add(path.basename(cachePath));
      const preparedSource = `${JSON.stringify(bundle, null, 2)}\n`;
      const preparedPath = path.join(stagingDirectory, `${kind}.json`);
      await writeBufferFileAtomically(preparedPath, Buffer.from(preparedSource, 'utf8'));

      const blobBySha256 = new Map(
        bundle.artifacts.blobs.map((blob) => [blob.sha256, blob.contentBase64]),
      );
      const assetsDirectory = path.join(stagingDirectory, 'assets', kind);
      await ensureDirectory(assetsDirectory);
      for (const artifact of bundle.artifacts.files) {
        const contentBase64 = blobBySha256.get(artifact.sha256);
        if (contentBase64 === undefined) {
          throw new Error(`Evidence artifact ${artifact.path} references a missing blob.`);
        }
        const artifactPath = resolveContainedPath(assetsDirectory, artifact.path);
        await writeBufferFileAtomically(artifactPath, Buffer.from(contentBase64, 'base64'));
      }

      prepared[kind] = {
        assetsPath: path.posix.join(snapshotRelativePath, 'assets', kind),
        bundleSha256: reference.sha256,
        path: path.posix.join(snapshotRelativePath, `${kind}.json`),
        preparedSha256: calculateSha256(preparedSource),
      };
    }

    const currentSelection = await readJsonFile(options.selectionPath, EvidenceSelectionSchema);
    if (calculateSha256(`${JSON.stringify(currentSelection)}\n`) !== selectionSha256) {
      throw new Error('Evidence selection changed during preparation. Run preparation again.');
    }

    await ensureDirectory(path.dirname(snapshotDirectory));
    await rename(stagingDirectory, snapshotDirectory);
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }

  const semantic = prepared.semantic;
  const qualification = prepared.qualification;
  if (semantic === undefined || qualification === undefined) {
    throw new Error('Evidence preparation did not produce both selected sections.');
  }
  const manifest: IEvidencePreparationManifest = {
    formatVersion: 1,
    qualification,
    selectionSha256,
    semantic,
  };
  await writeJsonFileAtomically(path.join(options.preparedDirectory, 'manifest.json'), manifest);

  for (const entry of await readdir(options.cacheDirectory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.json.gz') && !selectedCachePaths.has(entry.name)) {
      await rm(path.join(options.cacheDirectory, entry.name), { force: true });
    }
  }
  const snapshotsDirectory = path.join(options.preparedDirectory, 'snapshots');
  for (const entry of await readdir(snapshotsDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== snapshotName) {
      await rm(path.join(snapshotsDirectory, entry.name), { force: true, recursive: true });
    }
  }
  return manifest;
};

/**
 * Validates the already prepared selected evidence without downloading or changing any file.
 * @returns The exact manifest accepted for release assurance.
 */
export const verifyPreparedReleaseEvidence = async (options: {
  preparedDirectory: string;
  selectionPath: string;
}): Promise<IEvidencePreparationManifest> => {
  const [manifest, selection] = await Promise.all([
    readJsonFile(
      path.join(options.preparedDirectory, 'manifest.json'),
      EvidencePreparationManifestSchema,
    ),
    readJsonFile(options.selectionPath, EvidenceSelectionSchema),
  ]);
  const selectionSha256 = calculateSha256(`${JSON.stringify(selection)}\n`);
  if (manifest.selectionSha256 !== selectionSha256) {
    throw new Error('Prepared evidence does not match the current selection.');
  }

  for (const kind of ['semantic', 'qualification'] as const) {
    const reference = selection[kind];
    if (reference === null) throw new Error(`Release evidence has no selected ${kind} bundle.`);
    const preparedSection = manifest[kind];
    if (preparedSection.bundleSha256 !== reference.sha256) {
      throw new Error(`Prepared ${kind} evidence does not match its selected bundle digest.`);
    }
    const preparedPath = resolveContainedPath(options.preparedDirectory, preparedSection.path);
    const preparedSource = await readFile(preparedPath, 'utf8');
    if (calculateSha256(preparedSource) !== preparedSection.preparedSha256) {
      throw new Error(`Prepared ${kind} evidence content has changed.`);
    }
    const bundle = validateEvidenceBundle(JSON.parse(preparedSource) as unknown);
    if (
      bundle.kind !== kind ||
      bundle.classification !== 'official' ||
      bundle.run.status !== 'passed'
    ) {
      throw new Error(`Release assurance requires passing official ${kind} evidence.`);
    }
  }

  return manifest;
};
