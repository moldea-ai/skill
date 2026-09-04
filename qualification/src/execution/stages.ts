import { QUALIFICATION_MAXIMUM_OPERATIONAL_RETRY_COUNT } from '../constants/index.ts';
import {
  QualificationStageCheckpointSchema,
  type IQualificationAttemptCheckpoint,
  type IQualificationTrialResult,
} from '../contracts/index.ts';
import { writeAttemptCheckpoint } from '../checkpoint/index.ts';

const QUALIFICATION_TRIAL_STAGE_NAMES = [
  'prepare',
  'deterministic-before',
  'actor',
  'deterministic-after',
  'assertions',
  'judge',
] as const;

/** Returns the planned actor and judge calls for every selected profile case. */
export const getQualificationPlannedCallCount = (
  caseCount: number,
  includeConfirmations = true,
): number => {
  if (!Number.isSafeInteger(caseCount) || caseCount < 0) {
    throw new Error('Qualification case count must be a non-negative integer.');
  }

  return caseCount * (includeConfirmations ? 6 : 2);
};

/** Returns the hard paid-call ceiling after bounded operational retries. */
export const getQualificationMaximumCallCount = (plannedCallCount: number): number => {
  if (!Number.isSafeInteger(plannedCallCount) || plannedCallCount < 0) {
    throw new Error('Qualification planned call count must be a non-negative integer.');
  }

  return plannedCallCount * (QUALIFICATION_MAXIMUM_OPERATIONAL_RETRY_COUNT + 1);
};

/** Returns the deterministic stage ids owned by one initial or confirmation trial. */
export const createQualificationTrialStageIds = (
  caseId: string,
  trialId: IQualificationTrialResult['trialId'],
): string[] =>
  QUALIFICATION_TRIAL_STAGE_NAMES.map(
    (stageName) => `case:${caseId}:trial:${trialId}:${stageName}`,
  );

/** Returns the exact protocol 7 stage inventory for the selected cases. */
export const createQualificationStageIds = (
  caseIds: readonly string[],
  includeConfirmations = true,
): string[] => [
  'source-state',
  'coverage',
  'candidate',
  'baseline',
  ...caseIds.flatMap((caseId) => [
    ...createQualificationTrialStageIds(caseId, 'initial'),
    ...(includeConfirmations
      ? [
          ...createQualificationTrialStageIds(caseId, 'confirmation-1'),
          ...createQualificationTrialStageIds(caseId, 'confirmation-2'),
        ]
      : []),
    `case:${caseId}:result`,
  ]),
];

const updateCheckpointStage = (
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  stage: unknown,
): IQualificationAttemptCheckpoint => ({
  ...checkpoint,
  updatedAt: new Date().toISOString(),
  stages: {
    ...checkpoint.stages,
    [stageId]: QualificationStageCheckpointSchema.parse(stage),
  },
});

/** Marks one pending stage running and persists it before side effects begin. */
export const startQualificationStage = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  cacheKey?: string | null,
): Promise<IQualificationAttemptCheckpoint> => {
  const existingStage = checkpoint.stages[stageId];

  if (existingStage === undefined) {
    throw new Error(`Unknown qualification stage ${stageId}.`);
  }

  const updatedCheckpoint = updateCheckpointStage(checkpoint, stageId, {
    ...existingStage,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    cacheKey: cacheKey ?? existingStage.cacheKey,
    cacheSourceAttemptId: null,
    error: null,
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Persists the content-addressed model identity before cache lookup or host execution. */
export const setQualificationStageCacheKey = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  cacheKey: string,
): Promise<IQualificationAttemptCheckpoint> => {
  const existingStage = checkpoint.stages[stageId];

  if (existingStage?.status !== 'running') {
    throw new Error(`Qualification stage ${stageId} is not running.`);
  }

  const updatedCheckpoint = updateCheckpointStage(checkpoint, stageId, {
    ...existingStage,
    cacheKey,
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Completes one running stage with pass, failure, error, or exact cache reuse evidence. */
export const completeQualificationStage = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  options: {
    status: 'cached' | 'errored' | 'failed' | 'passed' | 'skipped';
    cacheKey?: string | null;
    cacheSourceAttemptId?: string | null;
    error?: string | null;
  },
): Promise<IQualificationAttemptCheckpoint> => {
  const existingStage = checkpoint.stages[stageId];

  if (existingStage === undefined || existingStage.startedAt === null) {
    throw new Error(`Qualification stage ${stageId} was not started.`);
  }

  const completedAt = new Date();
  const startedAt = new Date(existingStage.startedAt);
  const updatedCheckpoint = updateCheckpointStage(checkpoint, stageId, {
    ...existingStage,
    status: options.status,
    completedAt: completedAt.toISOString(),
    durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
    cacheKey: options.cacheKey ?? existingStage.cacheKey,
    cacheSourceAttemptId: options.cacheSourceAttemptId ?? null,
    error: options.error ?? null,
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Returns whether a stage already owns terminal reusable evidence. */
export const isQualificationStageComplete = (
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
): boolean => {
  const status = checkpoint.stages[stageId]?.status;
  return status === 'cached' || status === 'failed' || status === 'passed' || status === 'skipped';
};
