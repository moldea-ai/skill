// command line
export {
  parseSemanticEvaluationArguments,
  type ISemanticDiagnosticSelector,
  type ISemanticEvaluationArguments,
} from './command-line/index.ts';

// cases
export {
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  defineSemanticCase,
  getSemanticCriterionLabels,
  loadSemanticCases,
  SemanticCaseDefinitionSchema,
  type IMoldeaResourceBudget,
  type ISemanticCase,
  type ISemanticCaseDefinition,
  type ISemanticCaseSetup,
  type ISemanticCaseSetupContext,
  type ISemanticCaseSetupResult,
  type ISemanticCriterion,
  type ISemanticGitStateFact,
  type ISemanticRepositoryEvidenceDeclaration,
  type ISemanticRepositoryEvidenceSource,
  validateSemanticCaseDefinition,
} from './cases/index.ts';

// coverage
export {
  createSemanticCoverage,
  createSemanticCoverageDigest,
  type ISemanticCoverage,
  type ISemanticCoverageClaim,
  type ISemanticCoverageClaimSource,
  type ISemanticCoverageEvidence,
} from './coverage/index.ts';

// execution
export {
  createMoldeaResourceEvidence,
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingMoldeaActivation,
  hasPassingMoldeaResourceBudget,
  hasPassingMoldeaResourceContainment,
  hasPassingSemanticResultDimensions,
  hasValidActorExecutionEvidence,
  hasValidMoldeaResourceEvidence,
  isSemanticConfirmationEligible,
  parseSemanticEvaluationHostOutput,
  projectActorExecutionEvidenceEvent,
  type IMoldeaResourceEvidence,
  type ISemanticActorExecutionEvidence,
  type ISemanticActorExecutionEvidenceOptions,
  type ISemanticActorExecutionOutputEvidence,
  type ISemanticActorExecutionOutputFact,
  type ISemanticHostOutput,
  type ISemanticResultDimensions,
} from './execution/index.ts';

// public evidence presentation
export type {
  ISemanticAttemptRecord,
  ISemanticAttemptModel,
  ISemanticAttemptTrialModel,
  ISemanticCasePresentationModel,
  ISemanticCliIdentity,
  ISemanticEvidenceMatch,
  ISemanticEvidenceSource,
  ISemanticEvaluationCaseId,
  ISemanticEvaluationCaseModel,
  ISemanticEvaluationCaseStatus,
  ISemanticEvaluationGroupId,
  ISemanticEvaluationGroupModel,
  ISemanticEvaluationWebsiteModel,
} from './public-evidence/index.ts';
export {
  createSemanticCatalogWebsiteModel,
  createSemanticEvidenceBundle,
  parseSemanticWebsiteModel,
} from './public-evidence/index.ts';

// local recording
export {
  createSemanticReplay,
  getSemanticCheckpointPath,
  readSemanticCheckpoint,
  writeSemanticCheckpoint,
  type ISemanticCandidateCheckpoint,
  type ISemanticRecordedCase,
  type ISemanticRecordedTrial,
} from './recording/index.ts';

// judgment
export {
  assessSemanticJudgeOutput,
  buildSemanticActorPrompt,
  buildSemanticJudgePrompt,
  enforceMoldeaProductNameCasing,
  hasValidMoldeaProductNameCasing,
  INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL,
  type ISemanticProductNameAssessment,
  type ISemanticJudgePromptOptions,
} from './judging/index.ts';

// stage identity and local reuse
export {
  createSemanticActorStageIdentity,
  createSemanticJudgeStageIdentity,
  createSemanticStageReuseRecord,
  createSemanticStageValueDigest,
  hasValidSemanticStageReuseRecord,
  selectSemanticStageReuse,
  type ISemanticModelHostIdentity,
  type ISemanticStageIdentity,
  type ISemanticStageName,
  type ISemanticStageReuseExpectation,
  type ISemanticStageReuseRecord,
  type ISemanticStageTrialIdentity,
} from './stages/index.ts';

// semantic workspaces
export {
  createActorRepository,
  createSemanticCaseSetup,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
  type ISemanticWorkspaceChanges,
  type ISemanticWorkspaceSnapshot,
} from './workspace/index.ts';
