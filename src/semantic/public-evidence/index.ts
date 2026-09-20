// public presentation contracts
export type {
  ISemanticAttemptRecord,
  ISemanticAttemptModel,
  ISemanticAttemptTrialModel,
  ISemanticCaseDefinition,
  ISemanticCasePresentationModel,
  ISemanticCliIdentity,
  ISemanticCriterion,
  ISemanticEvidenceMatch,
  ISemanticEvidenceSource,
  ISemanticEvaluationCaseId,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationCaseStatus,
  ISemanticEvaluationGroupId,
  ISemanticEvaluationGroupModel,
  ISemanticEvaluationWebsiteModel,
} from './types.ts';

// bundle projection
export { createSemanticEvidenceBundle } from './projection.ts';

// boundary validation
export { parseSemanticWebsiteModel } from './validation.ts';
