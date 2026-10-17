// types
export type {
  ISemanticCycleEvidence,
  ISemanticPaidInvocation,
  IMoldeaResourceEvidence,
  ISemanticActorExecutionEvidence,
  ISemanticActorExecutionEvidenceOptions,
  ISemanticActorExecutionOutputEvidence,
  ISemanticActorExecutionOutputFact,
} from './types.ts';

// request cycles
export { hasValidSemanticCycles, summarizeSemanticCycles } from './cycles.ts';

// actor evidence
export {
  createMoldeaResourceEvidence,
  hasPassingMoldeaActivation,
  hasPassingRepairGitEvidence,
  hasPassingMoldeaResourceBudget,
  hasPassingMoldeaResourceContainment,
  hasValidActorExecutionEvidence,
  hasValidMoldeaResourceEvidence,
  hasVerifiedManagedAgentsHandoff,
  projectActorExecutionEvidenceEvent,
} from './actor-evidence.ts';

// model-host output
export { parseSemanticEvaluationHostOutput, type ISemanticHostOutput } from './host-output.ts';

// outcome dimensions
export {
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingCaseRepairGitEvidence,
  hasPassingSemanticResultDimensions,
  isSemanticConfirmationEligible,
  SEMANTIC_RESULT_DIMENSION_NAMES,
  type ISemanticResultDimensions,
} from './outcomes.ts';
