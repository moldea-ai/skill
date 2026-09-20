import { gunzipSync, gzipSync } from 'node:zlib';

import { calculateSha256 } from '../filesystem/index.ts';
import { MAXIMUM_EVIDENCE_ARTIFACT_BYTES, MAXIMUM_EVIDENCE_BUNDLE_BYTES } from './constants.ts';
import {
  EvidenceBundleSchema,
  assertEvidenceArtifactLimits,
  type ICreateEvidenceBundleOptions,
  type IEvidenceBundle,
} from './types.ts';

const SENSITIVE_PROPERTY_PATTERN =
  /^(?:accessToken|apiKey|authorization|cookie|privateKey|refreshToken|secret)$/iu;
const EXECUTABLE_EXTENSION_PATTERN = /\.(?:bat|cmd|com|dll|dylib|exe|msi|ps1|so)$/iu;

const assertNoSensitiveProperties = (input: unknown): void => {
  const pendingValues: unknown[] = [input];
  while (pendingValues.length > 0) {
    const current = pendingValues.pop();
    if (Array.isArray(current)) {
      for (const propertyValue of current as unknown[]) pendingValues.push(propertyValue);
      continue;
    }
    if (current === null || typeof current !== 'object') continue;
    for (const [key, propertyValue] of Object.entries(current)) {
      if (SENSITIVE_PROPERTY_PATTERN.test(key) && propertyValue !== null && propertyValue !== '') {
        throw new Error(`Evidence payload contains forbidden sensitive property ${key}.`);
      }
      pendingValues.push(propertyValue);
    }
  }
};

const assertArtifactContentIsSafe = (path: string, content: Uint8Array): void => {
  if (EXECUTABLE_EXTENSION_PATTERN.test(path)) {
    throw new Error(`Evidence artifact ${path} uses a forbidden executable extension.`);
  }
  if (
    (content[0] === 0x7f && content[1] === 0x45 && content[2] === 0x4c && content[3] === 0x46) ||
    (content[0] === 0x4d && content[1] === 0x5a)
  ) {
    throw new Error(`Evidence artifact ${path} contains executable binary content.`);
  }
};

/**
 * Creates one validated evidence bundle while deduplicating exact artifact bytes.
 * @param options Recorded public payload, provenance, and downloadable artifact inputs.
 * @returns The validated format-version 1 evidence bundle.
 */
export const createEvidenceBundle = (options: ICreateEvidenceBundleOptions): IEvidenceBundle => {
  assertNoSensitiveProperties(options.payload);
  const blobBySha256 = new Map<
    string,
    { byteCount: number; contentBase64: string; sha256: string }
  >();
  const files = (options.artifacts ?? []).map((artifact) => {
    if (artifact.content.byteLength > MAXIMUM_EVIDENCE_ARTIFACT_BYTES) {
      throw new Error(
        `Evidence artifact ${artifact.path} exceeds ${MAXIMUM_EVIDENCE_ARTIFACT_BYTES} bytes.`,
      );
    }
    assertArtifactContentIsSafe(artifact.path, artifact.content);
    const sha256 = calculateSha256(artifact.content);
    blobBySha256.set(sha256, {
      byteCount: artifact.content.byteLength,
      contentBase64: Buffer.from(artifact.content).toString('base64'),
      sha256,
    });
    return { mediaType: artifact.mediaType, path: artifact.path, sha256 };
  });

  const bundle = EvidenceBundleSchema.parse({
    artifacts: { blobs: [...blobBySha256.values()], files },
    classification: options.classification,
    formatVersion: 1,
    kind: options.kind,
    payload: options.payload,
    run: options.run,
  });
  validateEvidenceBundle(bundle);
  return bundle;
};

/** Validates artifact references, content digests, paths, and aggregate limits. */
export const validateEvidenceBundle = (input: unknown): IEvidenceBundle => {
  const bundle = EvidenceBundleSchema.parse(input);
  assertNoSensitiveProperties(bundle.payload);
  assertEvidenceArtifactLimits(bundle);

  const blobBySha256 = new Map(bundle.artifacts.blobs.map((blob) => [blob.sha256, blob]));
  if (blobBySha256.size !== bundle.artifacts.blobs.length) {
    throw new Error('Evidence bundle contains duplicate artifact blobs.');
  }
  const filePaths = new Set<string>();
  for (const file of bundle.artifacts.files) {
    const foldedPath = file.path.normalize('NFC').toLocaleLowerCase('en-US');
    if (filePaths.has(foldedPath)) {
      throw new Error(`Evidence bundle contains a duplicate artifact path: ${file.path}`);
    }
    filePaths.add(foldedPath);
    const blob = blobBySha256.get(file.sha256);
    if (blob === undefined) {
      throw new Error(`Evidence artifact ${file.path} references a missing blob.`);
    }
  }
  for (const blob of bundle.artifacts.blobs) {
    const content = Buffer.from(blob.contentBase64, 'base64');
    if (
      content.byteLength !== blob.byteCount ||
      content.toString('base64') !== blob.contentBase64 ||
      calculateSha256(content) !== blob.sha256
    ) {
      throw new Error(`Evidence artifact blob ${blob.sha256} has invalid content evidence.`);
    }
  }
  for (const file of bundle.artifacts.files) {
    const blob = blobBySha256.get(file.sha256);
    if (blob === undefined) continue;
    assertArtifactContentIsSafe(file.path, Buffer.from(blob.contentBase64, 'base64'));
  }
  return bundle;
};

/** Serializes and gzip-compresses one validated evidence bundle within fixed bounds. */
export const encodeEvidenceBundle = (input: unknown): Buffer => {
  const bundle = validateEvidenceBundle(input);
  const source = Buffer.from(`${JSON.stringify(bundle)}\n`, 'utf8');
  if (source.byteLength > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
    throw new Error(`Evidence bundle exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} expanded bytes.`);
  }
  const compressed = gzipSync(source, { level: 9 });
  if (compressed.byteLength > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
    throw new Error(`Evidence bundle exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} compressed bytes.`);
  }
  return compressed;
};

/** Decompresses and validates one bounded evidence bundle. */
export const decodeEvidenceBundle = (compressed: Uint8Array): IEvidenceBundle => {
  if (compressed.byteLength > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
    throw new Error(`Evidence bundle exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} compressed bytes.`);
  }
  let source: Buffer;
  try {
    source = gunzipSync(compressed, { maxOutputLength: MAXIMUM_EVIDENCE_BUNDLE_BYTES });
  } catch (error) {
    throw new Error('Evidence bundle could not be decompressed within its resource limit.', {
      cause: error,
    });
  }
  if (source.byteLength > MAXIMUM_EVIDENCE_BUNDLE_BYTES) {
    throw new Error(`Evidence bundle exceeds ${MAXIMUM_EVIDENCE_BUNDLE_BYTES} expanded bytes.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source.toString('utf8')) as unknown;
  } catch (error) {
    throw new Error('Evidence bundle is not valid JSON.', { cause: error });
  }
  return validateEvidenceBundle(parsed);
};
