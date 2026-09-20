import type {
  ICodexEvaluationOperationalExhaustion,
  ICodexEvaluationOperationalRetry,
} from '../../execution/host/index.ts';
import type {
  ISemanticActiveTrialActorEvidence,
  ISemanticActiveTrialCheckpoint,
  ISemanticRecordedTrial,
} from './types.ts';

type ISemanticTrialStage = 'actor' | 'judge';

/** Creates the durable boundary written before one semantic model stage begins. */
export const createSemanticActiveTrial = (
  confirmationIndex: 1 | 2 | 3 | null,
  startedAt: string,
): ISemanticActiveTrialCheckpoint => ({
  actorEvidence: null,
  confirmationIndex,
  operationalRetries: {
    actorFailureCount: 0,
    judgeFailureCount: 0,
    lastFailure: null,
  },
  phase: 'actor-pending',
  recordedTrial: null,
  startedAt,
  updatedAt: startedAt,
});

/** Returns whether an active trial requires explicit authorization for one more stage call. */
export const isSemanticActiveTrialStopped = (
  activeTrial: ISemanticActiveTrialCheckpoint,
): boolean => {
  const lastFailure = activeTrial.operationalRetries.lastFailure;
  return lastFailure?.isExhausted === true && activeTrial.phase === `${lastFailure.stage}-pending`;
};

const markStoppedStageResumed = (
  activeTrial: ISemanticActiveTrialCheckpoint,
  stage: ISemanticTrialStage,
): ISemanticActiveTrialCheckpoint => {
  const lastFailure = activeTrial.operationalRetries.lastFailure;
  if (lastFailure?.stage !== stage || !lastFailure.isExhausted) return activeTrial;
  return {
    ...activeTrial,
    operationalRetries: {
      ...activeTrial.operationalRetries,
      lastFailure: { ...lastFailure, isExhausted: false },
    },
  };
};

const requirePendingStage = (
  activeTrial: ISemanticActiveTrialCheckpoint,
  stage: ISemanticTrialStage,
): void => {
  if (activeTrial.phase !== `${stage}-pending`) {
    throw new Error(`Semantic ${stage} retry evidence requires a ${stage}-pending trial.`);
  }
};

/** Appends one automatic operational retry before its delay begins. */
export const appendSemanticOperationalRetry = (
  activeTrial: ISemanticActiveTrialCheckpoint,
  stage: ISemanticTrialStage,
  retry: ICodexEvaluationOperationalRetry,
): ISemanticActiveTrialCheckpoint => {
  requirePendingStage(activeTrial, stage);
  const failureCountKey = `${stage}FailureCount` as const;
  if (retry.failureCount !== activeTrial.operationalRetries[failureCountKey] + 1) {
    throw new Error(`Semantic ${stage} retry count is not consecutive.`);
  }
  return {
    ...activeTrial,
    operationalRetries: {
      ...activeTrial.operationalRetries,
      [failureCountKey]: retry.failureCount,
      lastFailure: {
        category: retry.category,
        failedAt: retry.failedAt,
        isExhausted: false,
        stage,
      },
    },
    updatedAt: retry.failedAt,
  };
};

/** Marks a stage as terminally stopped after its bounded automatic retry is exhausted. */
export const stopSemanticOperationalStage = (
  activeTrial: ISemanticActiveTrialCheckpoint,
  stage: ISemanticTrialStage,
  exhaustion: ICodexEvaluationOperationalExhaustion,
  isExplicitResume: boolean,
): ISemanticActiveTrialCheckpoint => {
  requirePendingStage(activeTrial, stage);
  const failureCountKey = `${stage}FailureCount` as const;
  const failureCount = isExplicitResume
    ? activeTrial.operationalRetries[failureCountKey] + 1
    : exhaustion.failureCount;
  return {
    ...activeTrial,
    operationalRetries: {
      ...activeTrial.operationalRetries,
      [failureCountKey]: failureCount,
      lastFailure: {
        category: exhaustion.category,
        failedAt: exhaustion.failedAt,
        isExhausted: true,
        stage,
      },
    },
    updatedAt: exhaustion.failedAt,
  };
};

/** Persists projected actor evidence before any judge call may begin. */
export const attachSemanticActorEvidence = (
  activeTrial: ISemanticActiveTrialCheckpoint,
  actorEvidence: ISemanticActiveTrialActorEvidence,
  updatedAt: string,
): ISemanticActiveTrialCheckpoint => {
  requirePendingStage(activeTrial, 'actor');
  const resumedTrial = markStoppedStageResumed(activeTrial, 'actor');
  return {
    ...resumedTrial,
    actorEvidence,
    phase: 'judge-pending',
    updatedAt,
  };
};

/** Persists a completed trial so recovery never repeats either completed model stage. */
export const completeSemanticActiveTrial = (
  activeTrial: ISemanticActiveTrialCheckpoint,
  recordedTrial: ISemanticRecordedTrial,
  updatedAt: string,
): ISemanticActiveTrialCheckpoint => {
  requirePendingStage(activeTrial, 'judge');
  const resumedTrial = markStoppedStageResumed(activeTrial, 'judge');
  return {
    ...resumedTrial,
    phase: 'trial-complete',
    recordedTrial,
    updatedAt,
  };
};
