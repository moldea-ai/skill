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

// assurance generations shown for immutable semantic attempts
export type ISemanticAssuranceGeneration = 'Current Sol' | 'Historical Sol' | 'Historical Terra';

// exact actor or judge host shown with one trial
export interface ISemanticEvaluationHostModel {
  model: 'gpt-5.6-sol' | 'gpt-5.6-terra';
  name: string;
  reasoningEffort: 'medium';
  version: string;
}

// normalized trial provenance across immutable summary generations
export interface ISemanticAttemptTrialModel {
  actorHost: ISemanticEvaluationHostModel;
  confirmationIndex: 1 | 2 | null;
  evaluatedAt: string;
  forbidden: string[];
  judgeHost: ISemanticEvaluationHostModel;
  kind: 'confirmation' | 'initial';
  observed: string[];
  passed: boolean;
  rationale: string;
}

// normalized case history used by static attempt pages
export interface ISemanticAttemptCaseModel {
  confirmationStatus: 'not-required' | 'passed' | 'rejected' | 'required';
  id: string;
  status: 'failed' | 'passed' | 'recovered';
  trials: ISemanticAttemptTrialModel[];
}

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
  trials: ISemanticAttemptTrialModel[];
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
  assuranceGeneration: ISemanticAssuranceGeneration;
  cases: ISemanticAttemptCaseModel[];
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
  evaluationModel: ISemanticEvaluationHostModel['model'];
  failedCaseCount: number;
  groups: ISemanticEvaluationGroupModel[];
  hasCurrentAssuranceAttempt: boolean;
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
