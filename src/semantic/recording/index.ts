// types
export type {
  ISemanticActiveTrialActorEvidence,
  ISemanticActiveTrialCheckpoint,
  ISemanticCandidateCheckpoint,
  ISemanticCaseCheckpoint,
  ISemanticEvaluationMode,
  ISemanticOperationalFailureRecord,
  ISemanticOperationalRetryState,
  ISemanticRecordedCase,
  ISemanticRecordedTrial,
  ISemanticReusableTrial,
} from './types.ts';

// paid-stage admission
export {
  createSemanticTokenAdmissionController,
  getSemanticCandidatePaidTokenCount,
  SEMANTIC_CANDIDATE_TOKEN_LIMIT,
  type ISemanticTokenAdmissionController,
} from './token-admission.ts';

// active-trial recovery
export {
  appendSemanticOperationalRetry,
  attachSemanticActorEvidence,
  completeSemanticActiveTrial,
  createSemanticActiveTrial,
  isSemanticActiveTrialStopped,
  stopSemanticOperationalStage,
} from './active-trial.ts';

// checkpoints
export {
  getSemanticCheckpointPath,
  parseSemanticRecordedCases,
  readSemanticCheckpoint,
  writeSemanticCheckpoint,
} from './checkpoint.ts';

// exact local passing-stage reuse
export { loadSemanticReusableTrials, selectSemanticReusableTrial } from './reuse.ts';

// public replay
export { createSemanticReplay } from './replay.ts';
