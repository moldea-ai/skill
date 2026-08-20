import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { LOCAL_QUALIFICATION_ROOT } from '../constants/index.ts';
import {
  QualificationAttemptResultDraftSchema,
  type IQualificationAttemptCheckpoint,
  type IQualificationAttemptResult,
} from '../contracts/index.ts';
import { readAttemptCheckpoint } from '../checkpoint/index.ts';
import { readJsonFile } from '../filesystem/index.ts';
import { recordQualificationResult } from '../result/index.ts';

const ATTEMPT_ID_PATTERN = /^[A-Za-z0-9._-]+$/u;

/** Resolves one local attempt directory without permitting path traversal. */
export const getLocalAttemptDirectory = (attemptId: string): string => {
  if (!ATTEMPT_ID_PATTERN.test(attemptId)) {
    throw new Error(`Invalid qualification attempt id: ${attemptId}`);
  }

  return path.join(LOCAL_QUALIFICATION_ROOT, 'attempts', attemptId);
};

/** Lists every valid local checkpoint in stable newest-first order. */
export const listLocalAttemptCheckpoints = async (): Promise<IQualificationAttemptCheckpoint[]> => {
  const attemptsRoot = path.join(LOCAL_QUALIFICATION_ROOT, 'attempts');
  let entries;

  try {
    entries = await readdir(attemptsRoot, { withFileTypes: true });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const checkpoints = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && ATTEMPT_ID_PATTERN.test(entry.name))
      .map((entry) => readAttemptCheckpoint(path.join(attemptsRoot, entry.name))),
  );

  return checkpoints.sort(
    (left, right) =>
      right.createdAt.localeCompare(left.createdAt, 'en') ||
      right.attemptId.localeCompare(left.attemptId, 'en'),
  );
};

/** Records a previously interrupted attempt's explicit incomplete result draft. */
export const recordIncompleteAttempt = async (
  attemptId: string,
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

  return recordQualificationResult({
    artifactDirectory: path.join(attemptDirectory, 'public'),
    result,
  });
};
