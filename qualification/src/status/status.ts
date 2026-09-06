import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../tooling/resource-calibration/profiles.mjs';
import { LOCAL_QUALIFICATION_ROOT } from '../constants/index.ts';
import { calculateSha256 } from '../filesystem/index.ts';
import { listLatestQualificationResults } from '../result/index.ts';
import { readQualificationStatusAttempt } from './attempt-summary.ts';
import {
  QualificationStatusCursorPayloadSchema,
  type ICreateQualificationStatusPageOptions,
  type ILoadQualificationStatusPageOptions,
  type IQualificationStatusAttempt,
  type IQualificationStatusCursorPayload,
  type IQualificationStatusLatestResult,
  type IQualificationStatusPage,
  type IQualificationStatusRecord,
  type IQualificationStatusScope,
  type IQualificationStatusUnavailableAttempt,
} from './types.ts';

const QUALIFICATION_STATUS_MAXIMUM_PAGE_RECORDS = 64;
const QUALIFICATION_STATUS_MAXIMUM_PAGE_BYTES =
  MOLDEA_SKILL_RESOURCE_PROFILES.ordinary.maxOutputPageBytes;
const STATUS_CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,2048}$/u;
const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9._-]+$/u;

/** Lists syntactically safe local attempt directories without following links. */
const listLocalStatusAttemptIds = async (attemptsRoot: string): Promise<string[]> => {
  let entries;

  try {
    entries = await readdir(attemptsRoot, { withFileTypes: true });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  return entries
    .filter((entry) => entry.isDirectory() && ATTEMPT_ID_PATTERN.test(entry.name))
    .map(({ name }) => name)
    .sort((left, right) => right.localeCompare(left, 'en'));
};

/** Projects one latest pointer into stable status metadata. */
const projectLatestResult = (
  latest: ICreateQualificationStatusPageOptions['latestResults'][number],
): IQualificationStatusLatestResult => ({
  kind: 'latest-result',
  protocolVersion: latest.protocolVersion,
  adapterId: latest.adapterId,
  implementationId: latest.implementationId,
  latestAttemptId: latest.latestAttemptId,
  latestStatus: latest.latestStatus,
  lastPassingAttemptId: latest.lastPassingAttemptId,
  updatedAt: latest.updatedAt,
});

/** Encodes a continuation cursor whose representation is not a public data contract. */
const encodeCursor = (payload: IQualificationStatusCursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

/** Decodes and validates one opaque continuation cursor. */
const decodeCursor = (cursor: string): IQualificationStatusCursorPayload => {
  if (!STATUS_CURSOR_PATTERN.test(cursor)) {
    throw new Error('Invalid qualification status cursor.');
  }

  try {
    return QualificationStatusCursorPayloadSchema.parse(
      JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown,
    );
  } catch {
    throw new Error('Invalid qualification status cursor.');
  }
};

/** Serializes a status page exactly as JSON output will be written. */
const calculatePageBytes = (page: IQualificationStatusPage): number =>
  Buffer.byteLength(`${JSON.stringify(page, null, 2)}\n`, 'utf8');

/** Creates one deterministic content-free page from already projected status records. */
export const createQualificationStatusPage = (
  options: ICreateQualificationStatusPageOptions,
): IQualificationStatusPage => {
  const scope: IQualificationStatusScope = options.isAll ? 'all' : 'actionable';
  const records: IQualificationStatusRecord[] = [
    ...options.attempts,
    ...options.unavailableAttempts,
    ...options.latestResults.map(projectLatestResult),
  ];
  const snapshot = calculateSha256(`${JSON.stringify({ scope, records })}\n`);
  const cursor = options.cursor === undefined ? null : decodeCursor(options.cursor);

  if (cursor !== null && cursor.scope !== scope) {
    throw new Error('Qualification status cursor does not match the requested scope.');
  }

  if (cursor !== null && cursor.snapshot !== snapshot) {
    throw new Error('Qualification status cursor is stale; restart status pagination.');
  }

  const offset = cursor?.offset ?? 0;

  if (offset >= records.length && offset !== 0) {
    throw new Error('Qualification status cursor is outside the selected snapshot.');
  }

  const counts = {
    attempts: options.attempts.length,
    unavailableAttempts: options.unavailableAttempts.length,
    latestResults: options.latestResults.length,
    total: records.length,
  };
  let endOffset = Math.min(offset + QUALIFICATION_STATUS_MAXIMUM_PAGE_RECORDS, records.length);

  while (true) {
    if (endOffset === offset && offset < records.length) {
      throw new Error(
        `Qualification status record exceeds the ${QUALIFICATION_STATUS_MAXIMUM_PAGE_BYTES}-byte output ceiling.`,
      );
    }

    const page: IQualificationStatusPage = {
      formatVersion: 1,
      scope,
      snapshot,
      counts,
      records: records.slice(offset, endOffset),
      nextCursor:
        endOffset < records.length
          ? encodeCursor({ formatVersion: 1, offset: endOffset, scope, snapshot })
          : null,
    };

    if (calculatePageBytes(page) <= QUALIFICATION_STATUS_MAXIMUM_PAGE_BYTES) {
      return page;
    }

    endOffset -= 1;
  }
};

/** Reads local attempts sequentially and retains only bounded status metadata. */
const inspectStatusAttempts = async (
  attemptsRoot: string,
  isAll: boolean,
): Promise<{
  attempts: IQualificationStatusAttempt[];
  unavailableAttempts: IQualificationStatusUnavailableAttempt[];
}> => {
  const attempts: IQualificationStatusAttempt[] = [];
  const unavailableAttempts: IQualificationStatusUnavailableAttempt[] = [];

  for (const attemptId of await listLocalStatusAttemptIds(attemptsRoot)) {
    const inspection = await readQualificationStatusAttempt(
      path.join(attemptsRoot, attemptId),
      attemptId,
    );

    if (inspection.attempt === null) {
      unavailableAttempts.push(inspection.unavailableAttempt);
      continue;
    }

    if (isAll || (inspection.attempt.status === 'incomplete' && !inspection.attempt.isRecorded)) {
      attempts.push(inspection.attempt);
    }
  }

  attempts.sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt, 'en') ||
      right.attemptId.localeCompare(left.attemptId, 'en'),
  );
  unavailableAttempts.sort((left, right) => right.attemptId.localeCompare(left.attemptId, 'en'));

  return { attempts, unavailableAttempts };
};

/** Lists compact local attempts for interactive recovery without reading checkpoint bodies. */
export const listLocalQualificationStatusAttempts = async (
  attemptsRoot = path.join(LOCAL_QUALIFICATION_ROOT, 'attempts'),
): Promise<IQualificationStatusAttempt[]> =>
  (await inspectStatusAttempts(attemptsRoot, false)).attempts;

/** Loads one bounded status page without exposing checkpoint or evidence bodies. */
export const loadQualificationStatusPage = async (
  options: ILoadQualificationStatusPageOptions,
): Promise<IQualificationStatusPage> => {
  const attemptsRoot = options.attemptsRoot ?? path.join(LOCAL_QUALIFICATION_ROOT, 'attempts');
  const [{ attempts, unavailableAttempts }, latestResults] = await Promise.all([
    inspectStatusAttempts(attemptsRoot, options.isAll),
    listLatestQualificationResults(options.resultsRoot),
  ]);

  return createQualificationStatusPage({
    attempts,
    unavailableAttempts,
    latestResults,
    isAll: options.isAll,
    ...(options.cursor === undefined ? {} : { cursor: options.cursor }),
  });
};
