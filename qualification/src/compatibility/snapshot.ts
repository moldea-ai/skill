import { randomUUID } from 'node:crypto';
import { lstat, link, open, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { stringifyJSONDeterministically } from 'web-utils-kit';

import { validateRuntimeCompatibilityPublication } from '../../../src/compatibility/index.ts';
import { calculateSha256, ensureDirectory } from '../../../src/filesystem/index.ts';
import { QUALIFICATION_ROOT } from '../constants/index.ts';
import {
  RUNTIME_COMPATIBILITY_SOURCE_URL,
  RuntimeCompatibilityMatrixSchema,
  RuntimeCompatibilitySnapshotSchema,
  type IRuntimeCompatibilityMatrix,
  type IRuntimeCompatibilitySnapshot,
} from './types.ts';

// reviewed local catalog and durable per-attempt capture names
export const RUNTIME_COMPATIBILITY_SNAPSHOT_PATH = path.join(
  QUALIFICATION_ROOT,
  'compatibility',
  'snapshot.json',
);
export const ATTEMPT_COMPATIBILITY_SNAPSHOT_NAME = 'compatibility-snapshot.json';
export const MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES = 1024 * 1024;

/**
 * Validates a complete publication and binds its canonical JSON digest.
 * @returns The complete publication and its content identity.
 * @throws
 * - The runtime compatibility publication has an unsupported root contract.
 * - The runtime compatibility publication has an invalid adapter.
 */
export const createRuntimeCompatibilitySnapshot = (
  input: unknown,
): IRuntimeCompatibilitySnapshot => {
  const publication = validateRuntimeCompatibilityPublication(input);
  RuntimeCompatibilityMatrixSchema.parse({
    adapters: publication.adapters,
    version: publication.matrixVersion,
  });
  return {
    formatVersion: 1,
    sourceUrl: RUNTIME_COMPATIBILITY_SOURCE_URL,
    sha256: calculateSha256(stringifyJSONDeterministically(publication)),
    publication,
  };
};

/**
 * Validates the complete envelope and its publication content digest.
 * @returns The validated snapshot.
 * @throws
 * - Runtime compatibility snapshot digest does not match its publication.
 */
export const validateRuntimeCompatibilitySnapshot = (
  input: unknown,
): IRuntimeCompatibilitySnapshot => {
  const snapshot = RuntimeCompatibilitySnapshotSchema.parse(input);
  const expected = createRuntimeCompatibilitySnapshot(snapshot.publication);
  if (snapshot.sha256 !== expected.sha256) {
    throw new Error('Runtime compatibility snapshot digest does not match its publication.');
  }
  return snapshot;
};

/**
 * Reads a bounded regular local snapshot without following a symlink.
 * @returns The validated local snapshot.
 * @throws
 * - Runtime compatibility snapshot must be a regular file within the size limit.
 * - Runtime compatibility snapshot changed while opening the regular file.
 * - Runtime compatibility snapshot exceeds the size limit.
 * - Runtime compatibility snapshot digest does not match its publication.
 */
export const readRuntimeCompatibilitySnapshot = async (
  snapshotPath = RUNTIME_COMPATIBILITY_SNAPSHOT_PATH,
): Promise<IRuntimeCompatibilitySnapshot> => {
  const stats = await lstat(snapshotPath);
  if (!stats.isFile() || stats.size > MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES) {
    throw new Error('Runtime compatibility snapshot must be a regular file within the size limit.');
  }
  const file = await open(snapshotPath, 'r');
  try {
    const openedStats = await file.stat();
    if (
      !openedStats.isFile() ||
      openedStats.dev !== stats.dev ||
      openedStats.ino !== stats.ino ||
      openedStats.size > MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES
    ) {
      throw new Error('Runtime compatibility snapshot changed while opening the regular file.');
    }
    const source = await file.readFile();
    if (source.byteLength > MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES) {
      throw new Error('Runtime compatibility snapshot exceeds the size limit.');
    }
    return validateRuntimeCompatibilitySnapshot(JSON.parse(source.toString('utf8')) as unknown);
  } finally {
    await file.close();
  }
};

/**
 * Derives the strict qualification matrix without dropping publication metadata from the snapshot.
 * @returns The qualification matrix.
 */
export const getRuntimeCompatibilityMatrix = (
  snapshot: IRuntimeCompatibilitySnapshot,
): IRuntimeCompatibilityMatrix =>
  RuntimeCompatibilityMatrixSchema.parse({
    adapters: snapshot.publication.adapters,
    version: snapshot.publication.matrixVersion,
  });

/**
 * Creates an immutable attempt-owned copy before any checkpoint is written.
 * @returns A promise that resolves after the capture exists.
 * @throws
 * - Runtime compatibility snapshot digest does not match its publication.
 */
export const captureAttemptCompatibilitySnapshot = async (
  attemptDirectory: string,
  snapshot: IRuntimeCompatibilitySnapshot,
): Promise<void> => {
  const validatedSnapshot = validateRuntimeCompatibilitySnapshot(snapshot);
  await ensureDirectory(attemptDirectory);
  const destination = path.join(attemptDirectory, ATTEMPT_COMPATIBILITY_SNAPSHOT_NAME);
  const temporaryPath = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(validatedSnapshot, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await link(temporaryPath, destination);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

/**
 * Reads one captured attempt input and checks its checkpointed identity.
 * @returns The complete captured snapshot.
 * @throws
 * - Captured compatibility snapshot does not match the attempt identity.
 */
export const readAttemptCompatibilitySnapshot = async (
  attemptDirectory: string,
  expected: Pick<IRuntimeCompatibilitySnapshot, 'sourceUrl' | 'sha256'>,
): Promise<IRuntimeCompatibilitySnapshot> => {
  const snapshot = await readRuntimeCompatibilitySnapshot(
    path.join(attemptDirectory, ATTEMPT_COMPATIBILITY_SNAPSHOT_NAME),
  );
  if (snapshot.sourceUrl !== expected.sourceUrl || snapshot.sha256 !== expected.sha256) {
    throw new Error('Captured compatibility snapshot does not match the attempt identity.');
  }
  return snapshot;
};
