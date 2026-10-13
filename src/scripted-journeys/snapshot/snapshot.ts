import { randomBytes } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import path from 'node:path';

import {
  getCompletedEvidenceRunPath,
  readCompletedEvidenceRun,
  storeCompletedEvidenceRun,
  MAXIMUM_EVIDENCE_BUNDLE_BYTES,
  type IEvidenceBundle,
} from '../../evidence/index.ts';
import type { IJourneyPlatform } from '../index.ts';
import { createJourneySnapshotEvidenceBundle } from '../public-evidence/index.ts';

/** Reads one explicit bounded local record, refusing links across its trusted storage boundary.
 * @returns The verified local evidence bundle.
 * @throws When the requested record is missing, linked, oversized, or not valid evidence.
 */
const readRecord = async (repositoryRoot: string, runId: string): Promise<IEvidenceBundle> => {
  const filename = getCompletedEvidenceRunPath(repositoryRoot, 'journeys', runId);
  let candidate = path.resolve(repositoryRoot);
  for (const component of path.relative(candidate, filename).split(path.sep)) {
    candidate = path.join(candidate, component);
    const metadata = await lstat(candidate);
    if (metadata.isSymbolicLink())
      throw new Error('Journey source record path contains a symlink.');
    if (
      candidate === filename &&
      (!metadata.isFile() || metadata.size > MAXIMUM_EVIDENCE_BUNDLE_BYTES)
    )
      throw new Error('Journey source record exceeds the bounded regular-file contract.');
  }
  const record = await readCompletedEvidenceRun(repositoryRoot, 'journeys', runId);
  if (record.run.attemptId !== runId)
    throw new Error('Requested journey record identity mismatch.');
  return record;
};

/** Creates a new local snapshot from only the supplied source IDs and whole-group selectors.
 * @returns The immutable snapshot identity, record path, and derived public status.
 * @throws When sources, selectors, destination, identities, or resource limits are invalid.
 */
export const composeJourneySnapshot = async (input: {
  repositoryRoot: string;
  runId: string;
  from?: string;
  platform?: IJourneyPlatform;
  journeys?: string[];
}): Promise<{ runId: string; recordPath: string; status: IEvidenceBundle['run']['status'] }> => {
  const incoming = await readRecord(input.repositoryRoot, input.runId);
  const previous =
    input.from === undefined ? undefined : await readRecord(input.repositoryRoot, input.from);
  const snapshotId = `journey-snapshot-${Date.now()}-${randomBytes(4).toString('hex')}`;
  const destination = getCompletedEvidenceRunPath(input.repositoryRoot, 'journeys', snapshotId);
  try {
    await lstat(destination);
    throw new Error('Journey snapshot destination already exists.');
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  const snapshot = createJourneySnapshotEvidenceBundle({
    incoming,
    ...(previous === undefined ? {} : { previous }),
    runId: snapshotId,
    evaluatedAt: new Date().toISOString(),
    ...(input.platform === undefined ? {} : { platform: input.platform }),
    ...(input.journeys === undefined ? {} : { journeys: input.journeys }),
  });
  const recordPath = await storeCompletedEvidenceRun(input.repositoryRoot, snapshot);
  return { runId: snapshotId, recordPath, status: snapshot.run.status };
};
