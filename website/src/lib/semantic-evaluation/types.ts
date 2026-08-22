import type { ISemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';

import type { SEMANTIC_CASE_PRESENTATION, SEMANTIC_EVALUATION_GROUPS } from './constants.ts';

export type ISemanticEvaluationGroupId = keyof typeof SEMANTIC_EVALUATION_GROUPS;
export type ISemanticEvaluationCaseId = keyof typeof SEMANTIC_CASE_PRESENTATION;

// one criterion declared in the repository-owned semantic case suite
export interface ISemanticCriterion {
  criterion: string;
  label: string;
}

// public case definition fields used to explain the evaluated scenario
export interface ISemanticCaseDefinition {
  expected: ISemanticCriterion[];
  forbidden: ISemanticCriterion[];
  id: string;
  input?: Record<string, unknown>;
  operation?: string;
  prompt?: string;
  scenario?: string;
  [key: string]: unknown;
}

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
  evaluatedAt: string;
  groups: ISemanticEvaluationGroupModel[];
  rawResultUrl: string;
  route: string;
}
