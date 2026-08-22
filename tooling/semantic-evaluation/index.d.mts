export interface ISemanticCriterion {
  criterion: string;
  label: string;
}

export interface ISemanticCaseDefinition {
  id: string;
  hostInstructions?: string;
  prompt?: string;
  scenario?: string;
  operation?: string;
  input?: Record<string, unknown>;
  expected: ISemanticCriterion[];
  forbidden: ISemanticCriterion[];
  [key: string]: unknown;
}

export const getSemanticCriterionLabels: (criteria: ISemanticCriterion[]) => string[];
export const validateSemanticCaseDefinition: <T extends ISemanticCaseDefinition>(
  caseDefinition: T,
) => T;
export const createSemanticCaseDefinitionDigest: (
  caseDefinition: ISemanticCaseDefinition,
) => string;
export const createSemanticCaseSuiteDigest: (caseDefinitions: ISemanticCaseDefinition[]) => string;
export const normalizePortableSkillSemanticEvidence: (
  relativePath: string,
  content: string,
) => string;
export const createPortableSkillDigest: (repositoryRoot?: string) => string;
export const createPortableSkillSemanticDigest: (repositoryRoot?: string) => string;
export const hasValidPortableSkillSemanticCarryForward: (
  carryForward: unknown,
  fromArtifactDigest: string,
  repositoryRoot?: string,
) => boolean;
