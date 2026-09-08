import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../tooling/resource-calibration/profiles.mjs';

import {
  QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
  QUALIFICATION_MAXIMUM_OPERATIONAL_RETRY_COUNT,
} from '../constants/index.ts';
import {
  QualificationAttemptCheckpointSchema,
  QualificationStageCheckpointSchema,
  type IQualificationAttemptCheckpoint,
  type IModelUsage,
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

/** Identifies a candidate-wide token stop without relying on message matching. */
export class QualificationCandidateTokenLimitError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'QualificationCandidateTokenLimitError';
  }
}

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

/** Returns the aggregate token ceiling for one bounded paid-execution envelope. */
export const getQualificationMaximumTokenCount = (maximumCallCount: number): number => {
  if (!Number.isSafeInteger(maximumCallCount) || maximumCallCount < 0) {
    throw new Error('Qualification maximum call count must be a non-negative integer.');
  }

  return maximumCallCount * MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;
};

/** Returns total charged tokens without counting cached input twice. */
export const getQualificationModelUsageTokenCount = (usage: IModelUsage): number =>
  usage.inputTokens + usage.outputTokens;

/** Refuses a new paid stage before its absolute reservation exceeds the candidate stop-loss. */
export const assertQualificationCandidateTokenReservation = (
  candidateTokensConsumed: number,
  candidateTokensReserved: number,
): void => {
  const reservation = getQualificationMaximumTokenCount(1);
  const projectedTotal = candidateTokensConsumed + candidateTokensReserved + reservation;

  if (projectedTotal > QUALIFICATION_CANDIDATE_TOKEN_LIMIT) {
    throw new QualificationCandidateTokenLimitError(
      `Qualification candidate token stop reached: ${candidateTokensConsumed} consumed, ` +
        `${candidateTokensReserved} reserved, ${reservation} required, ` +
        `${QUALIFICATION_CANDIDATE_TOKEN_LIMIT} maximum.`,
    );
  }
};

/** Reserves one absolute host envelope before launching a paid model stage. */
export const reserveQualificationCandidateTokens = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
): Promise<IQualificationAttemptCheckpoint> => {
  const reservation = getQualificationMaximumTokenCount(1);
  assertQualificationCandidateTokenReservation(
    checkpoint.candidateTokensConsumed,
    checkpoint.candidateTokensReserved,
  );

  const updatedCheckpoint = QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    candidateTokensReserved: checkpoint.candidateTokensReserved + reservation,
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Settles one reserved host envelope to observed usage or its conservative maximum. */
export const settleQualificationCandidateTokens = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  usage: IModelUsage | null,
): Promise<IQualificationAttemptCheckpoint> => {
  const reservation = getQualificationMaximumTokenCount(1);

  if (checkpoint.candidateTokensReserved < reservation) {
    throw new Error('Qualification candidate has no complete token reservation to settle.');
  }

  const chargedTokens = usage === null ? reservation : getQualificationModelUsageTokenCount(usage);

  if (chargedTokens > reservation) {
    throw new Error('Qualification model usage exceeds the absolute per-invocation token limit.');
  }
  const updatedCheckpoint = QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    candidateTokensConsumed: checkpoint.candidateTokensConsumed + chargedTokens,
    candidateTokensReserved: checkpoint.candidateTokensReserved - reservation,
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Returns the deterministic stage ids owned by one initial or confirmation trial. */
export const createQualificationTrialStageIds = (
  caseId: string,
  trialId: IQualificationTrialResult['trialId'],
): string[] =>
  QUALIFICATION_TRIAL_STAGE_NAMES.map(
    (stageName) => `case:${caseId}:trial:${trialId}:${stageName}`,
  );

/** Returns the exact protocol 8 stage inventory for the selected cases. */
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
  stageIdentity?: string | null,
): Promise<IQualificationAttemptCheckpoint> => {
  const existingStage = checkpoint.stages[stageId];

  if (existingStage?.status !== 'pending') {
    throw new Error(`Qualification stage ${stageId} is not pending.`);
  }

  const updatedCheckpoint = updateCheckpointStage(checkpoint, stageId, {
    ...existingStage,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: null,
    stageIdentity: stageIdentity ?? existingStage.stageIdentity,
    reuseSourceAttemptId: null,
    error: null,
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Persists the content-addressed model identity before host execution. */
export const setQualificationStageIdentity = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  stageIdentity: string,
): Promise<IQualificationAttemptCheckpoint> => {
  const existingStage = checkpoint.stages[stageId];

  if (existingStage?.status !== 'running') {
    throw new Error(`Qualification stage ${stageId} is not running.`);
  }

  const updatedCheckpoint = updateCheckpointStage(checkpoint, stageId, {
    ...existingStage,
    stageIdentity,
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Completes one running stage with pass, failure, error, skip, or exact evidence reuse. */
export const completeQualificationStage = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  options: {
    status: 'reused' | 'errored' | 'failed' | 'passed' | 'skipped';
    stageIdentity?: string | null;
    reuseSourceAttemptId?: string | null;
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
    stageIdentity: options.stageIdentity ?? existingStage.stageIdentity,
    reuseSourceAttemptId: options.reuseSourceAttemptId ?? null,
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
  return status === 'reused' || status === 'failed' || status === 'passed' || status === 'skipped';
};
