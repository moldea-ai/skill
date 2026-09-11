import { constants as filesystemConstants } from 'node:fs';
import { lstat, open, stat } from 'node:fs/promises';
import path from 'node:path';

import type { IQualificationAttemptCheckpoint } from '../contracts/index.ts';
import { writeTextFileAtomically } from '../filesystem/index.ts';
import {
  QualificationStatusAttemptFileSchema,
  QualificationStatusAttemptSchema,
  type IQualificationStatusAttempt,
  type IQualificationStatusUnavailableAttempt,
} from './types.ts';

const MAXIMUM_STATUS_SUMMARY_BYTES = 8_192;
const STATUS_SUMMARY_FILENAME = 'status.json';

/** Projects one complete checkpoint into the only fields status may disclose. */
export const createQualificationStatusAttempt = (
  checkpoint: IQualificationAttemptCheckpoint,
): IQualificationStatusAttempt =>
  QualificationStatusAttemptSchema.parse({
    kind: 'attempt',
    protocolVersion: checkpoint.protocolVersion,
    attemptId: checkpoint.attemptId,
    adapterId: checkpoint.selection.adapterId,
    implementationId: checkpoint.selection.implementationId,
    status: checkpoint.status,
    mode: checkpoint.mode,
    createdAt: checkpoint.createdAt,
    updatedAt: checkpoint.updatedAt,
    completedAt: checkpoint.completedAt,
    isRecorded: checkpoint.recordedAt !== null,
  });

/** Writes one bounded sidecar after its complete checkpoint is durable. */
export const writeQualificationStatusAttempt = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
): Promise<void> => {
  const checkpointStats = await stat(path.join(attemptDirectory, 'checkpoint.json'));
  const summary = QualificationStatusAttemptFileSchema.parse({
    formatVersion: 1,
    checkpointByteLength: checkpointStats.size,
    checkpointModifiedAtMs: checkpointStats.mtimeMs,
    attempt: createQualificationStatusAttempt(checkpoint),
  });
  const summarySource = `${JSON.stringify(summary, null, 2)}\n`;

  if (Buffer.byteLength(summarySource, 'utf8') > MAXIMUM_STATUS_SUMMARY_BYTES) {
    throw new Error(
      `Qualification status summary exceeds the ${MAXIMUM_STATUS_SUMMARY_BYTES}-byte storage ceiling.`,
    );
  }

  await writeTextFileAtomically(
    path.join(attemptDirectory, STATUS_SUMMARY_FILENAME),
    summarySource,
  );
};

/** Creates a content-free unavailable result for one local status sidecar. */
const createUnavailableAttempt = (
  attemptId: string,
  reason: IQualificationStatusUnavailableAttempt['reason'],
  protocolVersion: number | null = null,
): { attempt: null; unavailableAttempt: IQualificationStatusUnavailableAttempt } => ({
  attempt: null,
  unavailableAttempt: {
    kind: 'unavailable-attempt',
    attemptId,
    reason,
    protocolVersion,
  },
});

/** Reads one bounded sidecar and confirms it still names the current checkpoint generation. */
export const readQualificationStatusAttempt = async (
  attemptDirectory: string,
  attemptId: string,
): Promise<
  | { attempt: IQualificationStatusAttempt; unavailableAttempt: null }
  | { attempt: null; unavailableAttempt: IQualificationStatusUnavailableAttempt }
> => {
  const summaryPath = path.join(attemptDirectory, STATUS_SUMMARY_FILENAME);
  let checkpointStats;
  let initialSummaryStats;
  let summaryFile;

  try {
    [checkpointStats, initialSummaryStats] = await Promise.all([
      lstat(path.join(attemptDirectory, 'checkpoint.json')),
      lstat(summaryPath),
    ]);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return createUnavailableAttempt(attemptId, 'missing-status-summary');
    }

    return createUnavailableAttempt(attemptId, 'unreadable-status-summary');
  }

  if (!checkpointStats.isFile() || !initialSummaryStats.isFile()) {
    return createUnavailableAttempt(attemptId, 'invalid-status-summary');
  }

  if (initialSummaryStats.size > MAXIMUM_STATUS_SUMMARY_BYTES) {
    return createUnavailableAttempt(attemptId, 'oversized-status-summary');
  }

  try {
    summaryFile = await open(
      summaryPath,
      filesystemConstants.O_RDONLY | filesystemConstants.O_NOFOLLOW,
    );
    const summaryStats = await summaryFile.stat();

    if (
      !summaryStats.isFile() ||
      summaryStats.dev !== initialSummaryStats.dev ||
      summaryStats.ino !== initialSummaryStats.ino
    ) {
      return createUnavailableAttempt(attemptId, 'invalid-status-summary');
    }

    const summaryBuffer = Buffer.alloc(MAXIMUM_STATUS_SUMMARY_BYTES + 1);
    const { bytesRead } = await summaryFile.read(summaryBuffer, 0, summaryBuffer.length, 0);

    if (
      summaryStats.size > MAXIMUM_STATUS_SUMMARY_BYTES ||
      bytesRead > MAXIMUM_STATUS_SUMMARY_BYTES
    ) {
      return createUnavailableAttempt(attemptId, 'oversized-status-summary');
    }

    const finalSummaryStats = await summaryFile.stat();

    if (
      bytesRead !== summaryStats.size ||
      finalSummaryStats.size !== summaryStats.size ||
      finalSummaryStats.mtimeMs !== summaryStats.mtimeMs
    ) {
      return createUnavailableAttempt(attemptId, 'invalid-status-summary');
    }

    const summary = QualificationStatusAttemptFileSchema.parse(
      JSON.parse(summaryBuffer.subarray(0, bytesRead).toString('utf8')) as unknown,
    );

    if (
      summary.attempt.attemptId !== attemptId ||
      summary.checkpointByteLength !== checkpointStats.size ||
      summary.checkpointModifiedAtMs !== checkpointStats.mtimeMs
    ) {
      return createUnavailableAttempt(
        attemptId,
        'invalid-status-summary',
        summary.attempt.protocolVersion,
      );
    }

    return { attempt: summary.attempt, unavailableAttempt: null };
  } catch {
    return createUnavailableAttempt(attemptId, 'invalid-status-summary');
  } finally {
    await summaryFile?.close();
  }
};
