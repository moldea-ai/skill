import type { IEvaluationConfirmationResolution } from './types.ts';

// one current aggregation policy shared by semantic and qualification evaluation
export const EVALUATION_CONFIRMATION_POLICY = Object.freeze({
  version: 2,
  requiredPassingConfirmations: 2,
  requiredFailingConfirmations: 2,
  maximumConfirmations: 3,
} as const);

/**
 * Resolves an ordered confirmation sequence and rejects trials recorded after a quorum.
 * @param confirmations Ordered confirmation verdicts.
 * @returns The current confirmation resolution.
 * @throws
 * - Evaluation confirmations must be a bounded boolean sequence.
 * - Evaluation confirmation sequence continues after its terminal quorum.
 */
export const getEvaluationConfirmationResolution = (
  confirmations: readonly boolean[],
): IEvaluationConfirmationResolution => {
  if (
    !Array.isArray(confirmations) ||
    confirmations.length > EVALUATION_CONFIRMATION_POLICY.maximumConfirmations ||
    confirmations.some((passed) => typeof passed !== 'boolean')
  ) {
    throw new Error('Evaluation confirmations must be a bounded boolean sequence.');
  }

  let passingCount = 0;
  let failingCount = 0;

  for (const [index, passed] of confirmations.entries()) {
    if (passed) passingCount += 1;
    else failingCount += 1;

    const hasPassingQuorum =
      passingCount === EVALUATION_CONFIRMATION_POLICY.requiredPassingConfirmations;
    const hasFailingQuorum =
      failingCount === EVALUATION_CONFIRMATION_POLICY.requiredFailingConfirmations;

    if ((hasPassingQuorum || hasFailingQuorum) && index !== confirmations.length - 1) {
      throw new Error('Evaluation confirmation sequence continues after its terminal quorum.');
    }
    if (hasPassingQuorum) return 'recovered';
    if (hasFailingQuorum) return 'confirmed-failure';
  }

  return 'awaiting-confirmation';
};
