import { readFile } from 'node:fs/promises';

import { parseRuntimeCompatibilityPublication } from '../../../src/compatibility/index.ts';
import { writeTextFileAtomically } from '../../../src/filesystem/index.ts';
import { inspectQualificationCoverage } from '../coverage/index.ts';
import { loadQualificationProfileIndex } from '../storage/index.ts';
import { resolveQualificationTarget } from './loader.ts';
import {
  createRuntimeCompatibilitySnapshot,
  getRuntimeCompatibilityMatrix,
  MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES,
  readRuntimeCompatibilitySnapshot,
  RUNTIME_COMPATIBILITY_SNAPSHOT_PATH,
  validateRuntimeCompatibilitySnapshot,
} from './snapshot.ts';
import { RUNTIME_COMPATIBILITY_SOURCE_URL, type IRuntimeCompatibilitySnapshot } from './types.ts';

/**
 * Checks every indexed profile and its declared claim coverage against one publication.
 * @returns The validated profile count and catalog digest.
 * @throws
 * - Compatibility coverage failed for the selected profile.
 */
export const checkRuntimeCompatibilitySnapshot = async (
  snapshotInput?: IRuntimeCompatibilitySnapshot,
): Promise<{ profileCount: number; sha256: string }> => {
  const snapshot = snapshotInput
    ? validateRuntimeCompatibilitySnapshot(snapshotInput)
    : await readRuntimeCompatibilitySnapshot();
  const matrix = getRuntimeCompatibilityMatrix(snapshot);
  const index = await loadQualificationProfileIndex();
  for (const { adapterId, implementationId } of index.targets) {
    const target = await resolveQualificationTarget({ adapterId, implementationId }, matrix);
    const coverage = await inspectQualificationCoverage(
      target.profileDirectory,
      target.profile,
      target.adapter,
      target.target,
      target.caseCatalog,
    );
    if (!coverage.passed) {
      throw new Error(
        `Compatibility coverage failed for ${adapterId}/${implementationId}: ` +
          `missing ${coverage.missingClaims.join(', ') || '(none)'}; ` +
          `unknown ${coverage.unknownClaims.join(', ') || '(none)'}; ` +
          `uncovered cases ${coverage.uncoveredCaseIds.join(', ') || '(none)'}.`,
      );
    }
  }
  return { profileCount: index.targets.length, sha256: snapshot.sha256 };
};

const readBoundedResponse = async (response: Response): Promise<string> => {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null) {
    const size = Number(declaredLength);
    if (!Number.isSafeInteger(size) || size < 0 || size > MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES) {
      throw new Error('Published compatibility response has an invalid or oversized length.');
    }
  }
  if (response.body === null) {
    throw new Error('Published compatibility response has no body.');
  }
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for await (const rawChunk of response.body) {
    const chunk: unknown = rawChunk;
    if (!(chunk instanceof Uint8Array)) {
      throw new Error('Published compatibility response contains an invalid body chunk.');
    }
    totalBytes += chunk.byteLength;
    if (totalBytes > MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES) {
      throw new Error('Published compatibility response exceeds the size limit.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
};

/**
 * Explicitly refreshes the reviewed local snapshot after validating the full publication and profiles.
 * @returns Whether the local file changed, plus the validated profile count and digest.
 * @throws
 * - Published compatibility request failed with the returned HTTP status.
 * - Published compatibility response has an invalid or oversized length.
 * - Published compatibility response contains an invalid body chunk.
 * - Published compatibility response exceeds the size limit.
 * - Validated compatibility snapshot exceeds the size limit.
 */
export const updateRuntimeCompatibilitySnapshot = async (
  options: {
    fetcher?: typeof fetch;
    snapshotPath?: string;
  } = {},
): Promise<{ changed: boolean; profileCount: number; sha256: string }> => {
  const fetcher = options.fetcher ?? fetch;
  const snapshotPath = options.snapshotPath ?? RUNTIME_COMPATIBILITY_SNAPSHOT_PATH;
  const response = await fetcher(RUNTIME_COMPATIBILITY_SOURCE_URL, {
    redirect: 'manual',
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok || response.redirected || response.url !== RUNTIME_COMPATIBILITY_SOURCE_URL) {
    throw new Error(`Published compatibility request failed with HTTP ${response.status}.`);
  }
  const publication = parseRuntimeCompatibilityPublication(await readBoundedResponse(response));
  const snapshot = createRuntimeCompatibilitySnapshot(publication);
  const validation = await checkRuntimeCompatibilitySnapshot(snapshot);
  const content = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (Buffer.byteLength(content, 'utf8') > MAXIMUM_COMPATIBILITY_SNAPSHOT_BYTES) {
    throw new Error('Validated compatibility snapshot exceeds the size limit.');
  }
  let previous: string | undefined;
  try {
    previous = await readFile(snapshotPath, 'utf8');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
      throw error;
    }
  }
  if (previous === content) {
    return { changed: false, ...validation };
  }
  await writeTextFileAtomically(snapshotPath, content);
  return { changed: true, ...validation };
};
