// types
export type {
  IMoldeaResourceEvidence,
  ISemanticActorExecutionEvidence,
  ISemanticActorExecutionEvidenceOptions,
  ISemanticActorExecutionOutputEvidence,
  ISemanticActorExecutionOutputFact,
} from './types.ts';

// actor evidence
export {
  createMoldeaResourceEvidence,
  hasPassingMoldeaActivation,
  hasPassingMoldeaResourceBudget,
  hasPassingMoldeaResourceContainment,
  hasValidActorExecutionEvidence,
  hasValidMoldeaResourceEvidence,
  projectActorExecutionEvidenceEvent,
} from './actor-evidence.ts';

// model-host output
export { parseSemanticEvaluationHostOutput, type ISemanticHostOutput } from './host-output.ts';

// outcome dimensions
export {
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingSemanticResultDimensions,
  isSemanticConfirmationEligible,
  SEMANTIC_RESULT_DIMENSION_NAMES,
  type ISemanticResultDimensions,
} from './outcomes.ts';
