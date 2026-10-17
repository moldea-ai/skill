// types
export type {
  IMoldeaResourceBudget,
  ISemanticCase,
  ISemanticCaseDefinition,
  ISemanticCaseSetup,
  ISemanticCaseSetupContext,
  ISemanticCaseSetupResult,
  ISemanticCriterion,
  ISemanticGitStateFact,
  ISemanticRepositoryEvidenceDeclaration,
  ISemanticRepositoryEvidenceSource,
} from './types.ts';

// schema
export { SemanticCaseDefinitionSchema } from './schema.ts';

// authoring and discovery
export { defineSemanticCase } from './define.ts';
export { loadSemanticCases } from './loader.ts';

// fixture checkpoint requests
export {
  createRecordedSemanticDefinitions,
  hasMatchingSemanticRequest,
  hasRepairCheckpointRequest,
  resolveRepairCheckpointRequest,
} from './requests.ts';

// identity
export {
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  getSemanticCriterionLabels,
  validateSemanticCaseDefinition,
} from './evidence.ts';
