export const EVALUATION_CONFIRMATION_POLICY: Readonly<{
  version: 2;
  requiredPassingConfirmations: 2;
  requiredFailingConfirmations: 2;
  maximumConfirmations: 3;
}>;

export type IEvaluationConfirmationResolution =
  'awaiting-confirmation' | 'confirmed-failure' | 'recovered';

export const getEvaluationConfirmationResolution: (
  confirmations: readonly boolean[],
) => IEvaluationConfirmationResolution;
