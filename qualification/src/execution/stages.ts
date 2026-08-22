import {
  QualificationStageCheckpointSchema,
  type IQualificationAttemptCheckpoint,
} from '../contracts/index.ts';
import { writeAttemptCheckpoint } from '../checkpoint/index.ts';

/** Returns one actor and one judge call for every selected profile case. */
export const getQualificationModelCallCount = (caseCount: number): number => caseCount * 2;

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
  cacheKey: string | null = null,
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
    cacheKey,
    cacheSourceAttemptId: null,
    error: null,
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
