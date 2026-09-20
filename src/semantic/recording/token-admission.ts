import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import type {
  ISemanticCaseCheckpoint,
  ISemanticRecordedCase,
  ISemanticRecordedTrial,
} from './types.ts';

export const SEMANTIC_CANDIDATE_TOKEN_LIMIT = 32_000_000;

type ISemanticChargedTrial = Pick<ISemanticRecordedTrial, 'operationalRetries' | 'trial'>;
type ISemanticChargedCase = { trials: readonly ISemanticChargedTrial[] };

export interface ISemanticTokenAdmissionController {
  release: (reservationId: string) => Promise<void>;
  reserve: (reservationId: string) => Promise<void>;
}

const getUsageTokenCount = (usage: ISemanticRecordedTrial['trial']['actorUsage']): number =>
  usage === null
    ? MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount
    : usage.inputTokens + usage.outputTokens;

const getTrialPaidTokenCount = (recordedTrial: ISemanticChargedTrial): number => {
  if (recordedTrial.trial.executionOrigin === 'reused') return 0;
  return (
    getUsageTokenCount(recordedTrial.trial.actorUsage) +
    getUsageTokenCount(recordedTrial.trial.judgeUsage) +
    (recordedTrial.operationalRetries.actorFailureCount +
      recordedTrial.operationalRetries.judgeFailureCount) *
      MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount
  );
};

const getCasePaidTokenCount = (recordedCase: ISemanticChargedCase): number =>
  recordedCase.trials.reduce(
    (tokenCount, recordedTrial) => tokenCount + getTrialPaidTokenCount(recordedTrial),
    0,
  );

const getPrivateCasePaidTokenCount = (checkpoint: ISemanticCaseCheckpoint): number => {
  const completedTokenCount = getCasePaidTokenCount(checkpoint);
  const activeTrial = checkpoint.activeTrial;
  if (activeTrial === null) return completedTokenCount;
  if (activeTrial.phase === 'trial-complete' && activeTrial.recordedTrial !== null) {
    return completedTokenCount + getTrialPaidTokenCount(activeTrial.recordedTrial);
  }
  const retryTokenCount =
    (activeTrial.operationalRetries.actorFailureCount +
      activeTrial.operationalRetries.judgeFailureCount) *
    MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;
  const actorTokenCount =
    activeTrial.phase === 'judge-pending' && activeTrial.actorEvidence !== null
      ? getUsageTokenCount(activeTrial.actorEvidence.usage)
      : 0;
  return completedTokenCount + retryTokenCount + actorTokenCount;
};

/** Counts paid semantic tokens retained by committed and private worker checkpoints. */
export const getSemanticCandidatePaidTokenCount = (
  recordedCases: readonly ISemanticRecordedCase[],
  caseCheckpoints: Readonly<Record<string, ISemanticCaseCheckpoint>>,
): number => {
  const tokenCount =
    recordedCases.reduce((total, recordedCase) => total + getCasePaidTokenCount(recordedCase), 0) +
    Object.values(caseCheckpoints).reduce(
      (total, checkpoint) => total + getPrivateCasePaidTokenCount(checkpoint),
      0,
    );
  if (!Number.isSafeInteger(tokenCount) || tokenCount < 0) {
    throw new Error('Semantic candidate paid-token evidence is invalid.');
  }
  return tokenCount;
};

/** Serializes semantic paid-stage reservations across concurrent case workers. */
export const createSemanticTokenAdmissionController = (options: {
  getConsumedTokenCount: () => number;
}): ISemanticTokenAdmissionController => {
  const reservations = new Set<string>();
  let mutationQueue = Promise.resolve();

  const serialize = async (operation: () => void): Promise<void> => {
    const queuedMutation = mutationQueue.then(operation, operation);
    mutationQueue = queuedMutation.catch(() => {});
    await queuedMutation;
  };

  return {
    release: (reservationId) =>
      serialize(() => {
        if (!reservations.delete(reservationId)) {
          throw new Error(`Semantic worker ${reservationId} has no paid-stage reservation.`);
        }
      }),
    reserve: (reservationId) =>
      serialize(() => {
        if (reservations.has(reservationId)) {
          throw new Error(`Semantic worker ${reservationId} already has a paid-stage reservation.`);
        }
        const consumedTokenCount = options.getConsumedTokenCount();
        const reservedTokenCount =
          reservations.size * MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;
        const nextReservation = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;
        if (
          consumedTokenCount + reservedTokenCount + nextReservation >
          SEMANTIC_CANDIDATE_TOKEN_LIMIT
        ) {
          const error = new Error(
            `Semantic evaluation stopped before a paid stage: ${consumedTokenCount} tokens consumed, ` +
              `${reservedTokenCount} reserved, ${nextReservation} required, ` +
              `${SEMANTIC_CANDIDATE_TOKEN_LIMIT} maximum.`,
          );
          error.name = 'SemanticEvaluationResourceStopError';
          throw error;
        }
        reservations.add(reservationId);
      }),
  };
};
