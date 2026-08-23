import type { ISemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';
import type {
  ISemanticCaseDefinition as ISemanticCaseContract,
  ISemanticCriterion as ISemanticCriterionContract,
} from '../../../../tooling/semantic-evaluation/index.mjs';

import type { SEMANTIC_CASE_PRESENTATION, SEMANTIC_EVALUATION_GROUPS } from './constants.ts';

export type ISemanticEvaluationGroupId = keyof typeof SEMANTIC_EVALUATION_GROUPS;
export type ISemanticEvaluationCaseId = keyof typeof SEMANTIC_CASE_PRESENTATION;

// semantic contracts consumed directly from the repository-owned evaluator
export type ISemanticCriterion = ISemanticCriterionContract;
export type ISemanticCaseDefinition = ISemanticCaseContract;

// validated result fields safe to expose without actor transcripts or workspace contents
export interface ISemanticEvaluationCaseModel {
  evaluatedAt: string;
  expectedCriteria: ISemanticCriterion[];
  forbiddenCriteria: ISemanticCriterion[];
  groupId: ISemanticEvaluationGroupId;
  id: ISemanticEvaluationCaseId;
  rationale: string;
  scenario: string;
  title: string;
}

// readable collection of related semantic cases
export interface ISemanticEvaluationGroupModel {
  cases: ISemanticEvaluationCaseModel[];
  description: string;
  id: ISemanticEvaluationGroupId;
  title: string;
}

// deterministic passing semantic evidence embedded in the static website model
export interface ISemanticEvaluationWebsiteModel {
  artifactDigest: string;
  caseCount: number;
  caseSuiteDigest: string;
  cli: ISemanticCliIdentity;
  coverageDigest: string;
  coverageUrl: string;
  evaluatedAt: string;
  groups: ISemanticEvaluationGroupModel[];
  methodologyUrl: string;
  rawResultUrl: string;
  route: string;
}
