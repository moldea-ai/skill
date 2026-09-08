import type { IEvaluationReplayModel } from '@moldea.ai/website-ui/evaluation-replay-model';

import type { ICodexEvaluationCommandPolicyEvidence } from '../../../../tooling/codex-evaluation-host/index.mjs';
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
export type ISemanticEvidenceMatch = 'exact';

// exact actor or judge host shown with one trial
export interface ISemanticEvaluationActorHostModel {
  developerInstructionsSha256: string;
  model: 'gpt-5.6-sol';
  name: string;
  reasoningEffort: 'high';
  role: 'actor';
  version: string;
}

// exact independent judge host shown with one trial
export interface ISemanticEvaluationJudgeHostModel {
  developerInstructionsSha256: string;
  model: 'gpt-5.6-sol';
  name: string;
  reasoningEffort: 'xhigh';
  role: 'judge';
  version: string;
}

export type ISemanticFailureClassification =
  | 'semantic'
  | 'resource'
  | 'commandPolicy'
  | 'repositoryControl'
  | 'mountIntegrity'
  | 'operational';

// independently attributable public outcome dimensions
export interface ISemanticResultDimensions {
  semantic: boolean;
  resource: boolean;
  commandPolicy: boolean;
  repositoryControl: boolean;
  mountIntegrity: boolean;
  operational: boolean;
}

// exact current trial provenance shown on public attempt pages
export interface ISemanticAttemptTrialModel {
  actorCommandPolicyEvidence: ICodexEvaluationCommandPolicyEvidence;
  actorResourceEvidence: {
    commandCount: number;
    maximumInvocationByteCount: number;
    modelVisibleToolOutputByteCount: number;
    operations: Array<
      'composition' | 'content' | 'inspect' | 'scope' | 'unrecognized' | 'validate'
    >;
    stdoutByteCount: number;
  };
  actorHost: ISemanticEvaluationActorHostModel;
  confirmationEligible: boolean;
  confirmationIndex: 1 | 2 | null;
  dimensions: ISemanticResultDimensions;
  evaluatedAt: string;
  executionOrigin: 'executed' | 'reused';
  forbidden: string[];
  failureClassifications: ISemanticFailureClassification[];
  judgeCommandPolicyEvidence: ICodexEvaluationCommandPolicyEvidence;
  judgeHost: ISemanticEvaluationJudgeHostModel;
  kind: 'confirmation' | 'initial';
  observed: string[];
  passed: boolean;
  rationale: string;
  stageReuse: {
    actor: {
      identitySha256: string;
      origin: 'reused';
      schemaVersion: 1;
      source: {
        attemptId: string;
        commit: string;
        evidencePath: string;
        evidenceSha256: string;
        trial: {
          caseId: string;
          confirmationIndex: 1 | 2 | null;
          kind: 'confirmation' | 'initial';
        };
      };
      stage: 'actor';
    };
    judge: {
      identitySha256: string;
      origin: 'reused';
      schemaVersion: 1;
      source: {
        attemptId: string;
        commit: string;
        evidencePath: string;
        evidenceSha256: string;
        trial: {
          caseId: string;
          confirmationIndex: 1 | 2 | null;
          kind: 'confirmation' | 'initial';
        };
      };
      stage: 'judge';
    };
  } | null;
}

// semantic contracts consumed directly from the repository-owned evaluator
export type ISemanticCriterion = ISemanticCriterionContract;
export type ISemanticCaseDefinition = ISemanticCaseContract;

// current case state derived from the release-assurance attempt
export interface ISemanticEvaluationCaseModel {
  confirmationStatus: ISemanticAttemptRecord['cases'][number]['confirmationStatus'] | null;
  developerDirection: string | null;
  evaluatedAt: string | null;
  expectedCriteria: ISemanticCriterion[];
  forbiddenCriteria: ISemanticCriterion[];
  groupId: ISemanticEvaluationGroupId | null;
  hasCurrentCaseDefinition: boolean;
  id: string;
  rationale: string | null;
  replay: IEvaluationReplayModel | null;
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
  cases: ISemanticEvaluationCaseModel[];
  rawAttemptUrl: string;
  rawEvidenceUrl: string;
  result: ISemanticAttemptRecord;
  route: string;
}

// verified current semantic attempts embedded in the static website model
export interface ISemanticEvaluationWebsiteModel {
  artifactDigest: string;
  attempts: ISemanticAttemptModel[];
  caseCount: number;
  caseSuiteDigest: string;
  cli: ISemanticCliIdentity;
  coverageDigest: string;
  coverageUrl: string;
  currentAssurance: ISemanticAttemptModel | null;
  evidenceMatch: ISemanticEvidenceMatch | null;
  evaluatedAt: string | null;
  evaluationModel: ISemanticEvaluationActorHostModel['model'];
  failedCaseCount: number;
  groups: ISemanticEvaluationGroupModel[];
  hasAttempt: boolean;
  lastPassing: ISemanticAttemptModel | null;
  latest: ISemanticAttemptModel | null;
  latestPointer: ISemanticLatestResult | null;
  methodologyUrl: string;
  passedCaseCount: number;
  pendingCaseCount: number;
  recoveredCaseCount: number;
  route: string;
  status: ISemanticAttemptRecord['status'] | 'not-recorded';
}
