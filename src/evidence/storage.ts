import path from 'node:path';

import { z } from 'zod';

import {
  ensureDirectory,
  readJsonFile,
  resolveContainedPath,
  writeBufferFileAtomically,
  writeJsonFileAtomically,
} from '../filesystem/index.ts';
import { encodeEvidenceBundle, validateEvidenceBundle } from './bundle.ts';
import { LOCAL_EVIDENCE_RELATIVE_PATH } from './constants.ts';
import { EvidenceBundleSchema, type IEvidenceBundle, type IEvidenceKind } from './types.ts';

const LatestCompletedRunSchema = z.strictObject({ attemptId: z.string().min(1) });

const assertPortableAttemptId = (attemptId: string): void => {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(attemptId)) {
    throw new Error('Evidence attempt id must be a portable lowercase storage key.');
  }
};

const getLatestCompletedEvidenceRunPath = (repositoryRoot: string, kind: IEvidenceKind): string =>
  resolveContainedPath(
    repositoryRoot,
    path.posix.join(LOCAL_EVIDENCE_RELATIVE_PATH, 'runs', kind, 'latest.json'),
  );

/** Resolves one local completed-run record below ignored `.evidence/` storage. */
export const getCompletedEvidenceRunPath = (
  repositoryRoot: string,
  kind: IEvidenceKind,
  attemptId: string,
): string => {
  assertPortableAttemptId(attemptId);
  return resolveContainedPath(
    repositoryRoot,
    path.posix.join(LOCAL_EVIDENCE_RELATIVE_PATH, 'runs', kind, `${attemptId}.json`),
  );
};

/** Persists one complete validated run for local reuse and later publication packing. */
export const storeCompletedEvidenceRun = async (
  repositoryRoot: string,
  input: unknown,
): Promise<string> => {
  const bundle = validateEvidenceBundle(input);
  const runPath = getCompletedEvidenceRunPath(repositoryRoot, bundle.kind, bundle.run.attemptId);
  await writeJsonFileAtomically(runPath, bundle);
  await writeJsonFileAtomically(getLatestCompletedEvidenceRunPath(repositoryRoot, bundle.kind), {
    attemptId: bundle.run.attemptId,
  });
  return runPath;
};

/** Reads one exact local completed-run record. */
export const readCompletedEvidenceRun = async (
  repositoryRoot: string,
  kind: IEvidenceKind,
  attemptId: string,
): Promise<IEvidenceBundle> => {
  const bundle = await readJsonFile(
    getCompletedEvidenceRunPath(repositoryRoot, kind, attemptId),
    EvidenceBundleSchema,
  );
  return validateEvidenceBundle(bundle);
};

/** Packs one local completed-run record into its bounded release-asset representation. */
export const packCompletedEvidenceRun = async (
  repositoryRoot: string,
  kind: IEvidenceKind,
  attemptId: string,
  outputPath: string,
): Promise<{ byteCount: number; outputPath: string }> => {
  const bundle = await readCompletedEvidenceRun(repositoryRoot, kind, attemptId);
  const encoded = encodeEvidenceBundle(bundle);
  await ensureDirectory(path.dirname(outputPath));
  await writeBufferFileAtomically(outputPath, encoded);
  return { byteCount: encoded.byteLength, outputPath };
};

/** Packs the most recently completed local run for one evidence producer. */
export const packLatestCompletedEvidenceRun = async (
  repositoryRoot: string,
  kind: IEvidenceKind,
  outputDirectory: string,
): Promise<{ attemptId: string; byteCount: number; outputPath: string }> => {
  const { attemptId } = await readJsonFile(
    getLatestCompletedEvidenceRunPath(repositoryRoot, kind),
    LatestCompletedRunSchema,
  );
  assertPortableAttemptId(attemptId);
  const outputPath = path.join(outputDirectory, `${kind}-${attemptId}.json.gz`);
  const result = await packCompletedEvidenceRun(repositoryRoot, kind, attemptId, outputPath);
  return { ...result, attemptId };
};
