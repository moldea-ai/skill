import type { ISemanticCliIdentity } from '../../../../tooling/release-identity/identity.mjs';
import type {
  ISemanticCaseDefinition as ISemanticCaseContract,
  ISemanticCriterion as ISemanticCriterionContract,
} from '../../../../tooling/semantic-evaluation/index.mjs';

import type { SEMANTIC_CASE_PRESENTATION, SEMANTIC_EVALUATION_GROUPS } from './constants.ts';
import type { ISemanticAttemptRecord, ISemanticLatestResult } from './validations.ts';

export type ISemanticEvaluationGroupId = keyof typeof SEMANTIC_EVALUATION_GROUPS;
export type ISemanticEvaluationCaseId = keyof typeof SEMANTIC_CASE_PRESENTATION;
export type ISemanticEvaluationCaseStatus = 'failed' | 'passed' | 'pending' | 'recovered';

// semantic contracts consumed directly from the repository-owned evaluator
export type ISemanticCriterion = ISemanticCriterionContract;
export type ISemanticCaseDefinition = ISemanticCaseContract;

// current case state derived from the latest immutable attempt
export interface ISemanticEvaluationCaseModel {
  confirmationStatus: ISemanticAttemptRecord['cases'][number]['confirmationStatus'] | null;
  evaluatedAt: string | null;
  expectedCriteria: ISemanticCriterion[];
  forbiddenCriteria: ISemanticCriterion[];
  groupId: ISemanticEvaluationGroupId;
  id: ISemanticEvaluationCaseId;
  rationale: string | null;
  scenario: string;
  status: ISemanticEvaluationCaseStatus;
  title: string;
  trials: ISemanticAttemptRecord['cases'][number]['trials'];
}

// readable collection of related semantic cases
export interface ISemanticEvaluationGroupModel {
  cases: ISemanticEvaluationCaseModel[];
  description: string;
  id: ISemanticEvaluationGroupId;
  title: string;
}

// one immutable attempt with public routes to its summary and exact evidence
export interface ISemanticAttemptModel {
  rawAttemptUrl: string;
  rawEvidenceUrl: string;
  result: ISemanticAttemptRecord;
  route: string;
}

// verified semantic attempt history embedded in the static website model
export interface ISemanticEvaluationWebsiteModel {
  artifactDigest: string;
  attempts: ISemanticAttemptModel[];
  caseCount: number;
  caseSuiteDigest: string;
  cli: ISemanticCliIdentity;
  coverageDigest: string;
  coverageUrl: string;
  evaluatedAt: string;
  failedCaseCount: number;
  groups: ISemanticEvaluationGroupModel[];
  lastPassing: ISemanticAttemptModel | null;
  latest: ISemanticAttemptModel;
  latestPointer: ISemanticLatestResult;
  methodologyUrl: string;
  passedCaseCount: number;
  pendingCaseCount: number;
  recoveredCaseCount: number;
  route: string;
  status: ISemanticAttemptRecord['status'];
}
