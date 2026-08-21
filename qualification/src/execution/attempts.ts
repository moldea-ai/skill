import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  LOCAL_QUALIFICATION_ROOT,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
} from '../constants/index.ts';
import {
  QualificationAttemptCheckpointSchema,
  QualificationAttemptResultDraftSchema,
  type IQualificationAttemptCheckpoint,
  type IQualificationAttemptResult,
} from '../contracts/index.ts';
import { readAttemptCheckpoint, writeAttemptCheckpoint } from '../checkpoint/index.ts';
import { readJsonFile } from '../filesystem/index.ts';
import { recordQualificationResult } from '../result/index.ts';
import type { ILocalAttemptCheckpointInspection, IUnavailableLocalAttempt } from './types.ts';

const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9._-]+$/u;

/** Resolves one local attempt directory without permitting path traversal. */
export const getLocalAttemptDirectory = (attemptId: string): string => {
  if (!ATTEMPT_ID_PATTERN.test(attemptId)) {
    throw new Error(`Invalid qualification attempt id: ${attemptId}`);
  }

  return path.join(LOCAL_QUALIFICATION_ROOT, 'attempts', attemptId);
};

/** Reads a checkpoint version without trusting any other local checkpoint field. */
const readProtocolVersion = (checkpoint: unknown): number | null => {
  if (
    typeof checkpoint !== 'object' ||
    checkpoint === null ||
    !('protocolVersion' in checkpoint) ||
    typeof checkpoint.protocolVersion !== 'number'
  ) {
    return null;
  }

  return checkpoint.protocolVersion;
};

/** Summarizes schema issues without exposing host paths or mutating preserved evidence. */
const formatCheckpointIssues = (
  issues: readonly { message: string; path: PropertyKey[] }[],
): string =>
  issues
    .map(({ message, path: issuePath }) => {
      const location =
        issuePath.length === 0
          ? 'checkpoint'
          : issuePath.map((segment) => String(segment)).join('.');
      return `${location}: ${message}`;
    })
    .join('; ');

/** Inspects one attempt checkpoint while preserving incompatible local evidence. */
const inspectLocalAttemptCheckpoint = async (
  attemptsRoot: string,
  attemptId: string,
): Promise<
  | { checkpoint: IQualificationAttemptCheckpoint; unavailableAttempt: null }
  | { checkpoint: null; unavailableAttempt: IUnavailableLocalAttempt }
> => {
  let checkpoint: unknown;

  try {
    checkpoint = JSON.parse(
      await readFile(path.join(attemptsRoot, attemptId, 'checkpoint.json'), 'utf8'),
    ) as unknown;
  } catch {
    return {
      checkpoint: null,
      unavailableAttempt: {
        attemptId,
        kind: 'unreadable-checkpoint',
        message: 'Checkpoint could not be read as JSON and was preserved without changes.',
        protocolVersion: null,
      },
    };
  }

  const protocolVersion = readProtocolVersion(checkpoint);

  if (protocolVersion !== QUALIFICATION_EVIDENCE_PROTOCOL_VERSION) {
    return {
      checkpoint: null,
      unavailableAttempt: {
        attemptId,
        kind: 'unsupported-protocol',
        message:
          protocolVersion === null
            ? 'Checkpoint has no numeric protocol version and was preserved without changes.'
            : `Checkpoint protocol version ${protocolVersion} is not supported by protocol version ${QUALIFICATION_EVIDENCE_PROTOCOL_VERSION} and was preserved without changes.`,
        protocolVersion,
      },
    };
  }

  const result = QualificationAttemptCheckpointSchema.safeParse(checkpoint);

  if (!result.success) {
    return {
      checkpoint: null,
      unavailableAttempt: {
        attemptId,
        kind: 'invalid-checkpoint',
        message: `Checkpoint is invalid and was preserved without changes. ${formatCheckpointIssues(result.error.issues)}`,
        protocolVersion,
      },
    };
  }

  if (result.data.attemptId !== attemptId) {
    return {
      checkpoint: null,
      unavailableAttempt: {
        attemptId,
        kind: 'invalid-checkpoint',
        message: `Checkpoint attempt id ${result.data.attemptId} does not match its directory and was preserved without changes.`,
        protocolVersion,
      },
    };
  }

  return { checkpoint: result.data, unavailableAttempt: null };
};

/** Inspects every local attempt without letting one incompatible checkpoint hide valid recovery state. */
export const inspectLocalAttemptCheckpoints = async (
  attemptsRoot = path.join(LOCAL_QUALIFICATION_ROOT, 'attempts'),
): Promise<ILocalAttemptCheckpointInspection> => {
  let entries;

  try {
    entries = await readdir(attemptsRoot, { withFileTypes: true });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return { attempts: [], unavailableAttempts: [] };
    }

    throw error;
  }

  const inspectedAttempts = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && ATTEMPT_ID_PATTERN.test(entry.name))
      .map((entry) => inspectLocalAttemptCheckpoint(attemptsRoot, entry.name)),
  );
  const attempts = inspectedAttempts.flatMap(({ checkpoint }) =>
    checkpoint === null ? [] : [checkpoint],
  );
  const unavailableAttempts = inspectedAttempts.flatMap(({ unavailableAttempt }) =>
    unavailableAttempt === null ? [] : [unavailableAttempt],
  );

  return {
    attempts: attempts.sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt, 'en') ||
        right.attemptId.localeCompare(left.attemptId, 'en'),
    ),
    unavailableAttempts: unavailableAttempts.sort((left, right) =>
      right.attemptId.localeCompare(left.attemptId, 'en'),
    ),
  };
};

/** Lists every valid current-protocol local checkpoint in stable newest-first order. */
export const listLocalAttemptCheckpoints = async (
  attemptsRoot?: string,
): Promise<IQualificationAttemptCheckpoint[]> =>
  (await inspectLocalAttemptCheckpoints(attemptsRoot)).attempts;

/** Records a previously interrupted attempt's explicit incomplete result draft. */
export const recordIncompleteAttempt = async (
  attemptId: string,
  resultsRoot?: string,
): Promise<IQualificationAttemptResult> => {
  const attemptDirectory = getLocalAttemptDirectory(attemptId);
  const checkpoint = await readAttemptCheckpoint(attemptDirectory);

  if (checkpoint.status !== 'incomplete') {
    throw new Error(`Attempt ${attemptId} is ${checkpoint.status}, not incomplete.`);
  }

  if (checkpoint.isDryRun) {
    throw new Error('Dry-run attempts cannot be recorded as public evidence.');
  }

  const result = await readJsonFile(
    path.join(attemptDirectory, 'result-draft.json'),
    QualificationAttemptResultDraftSchema,
  );
  const recordedAt = new Date().toISOString();

  await writeAttemptCheckpoint(attemptDirectory, {
    ...checkpoint,
    recordedAt,
  });

  const recordedResult = await recordQualificationResult(
    {
      artifactDirectory: path.join(attemptDirectory, 'public'),
      result,
      sanitizationContext: {
        attemptDirectory,
        packagesRepository: checkpoint.packagesRepository,
        skillRepository: checkpoint.skillRepository,
      },
    },
    resultsRoot,
  );
  return recordedResult;
};
