// terminal status derived from an immutable semantic attempt
export type ISemanticAttemptStatus = 'failed' | 'incomplete' | 'passed';

// behavior-bearing semantic execution contract
export interface ISemanticEvaluationActorHostContract {
  developerInstructionsSha256: string;
  model: 'gpt-5.6-sol';
  name: 'codex';
  reasoningEffort: 'high' | 'xhigh';
  role: 'actor';
}

export interface ISemanticEvaluationJudgeHostContract {
  developerInstructionsSha256: string;
  model: 'gpt-5.6-sol';
  name: 'codex';
  reasoningEffort: 'xhigh';
  role: 'judge';
}

// closed actor and judge execution roles
export interface ISemanticEvaluationHostContract {
  actor: ISemanticEvaluationActorHostContract;
  judge: ISemanticEvaluationJudgeHostContract;
}

// exact non-sensitive provenance for one actor execution
export interface ISemanticEvaluationActorHostIdentity extends ISemanticEvaluationActorHostContract {
  version: string;
}

// exact non-sensitive provenance for one judge execution
export interface ISemanticEvaluationJudgeHostIdentity extends ISemanticEvaluationJudgeHostContract {
  version: string;
}

// aggregate command-policy evidence retained without raw command text
export type ISemanticAttemptCommandPolicyEvidence = ICodexEvaluationCommandPolicyEvidence;

// bounded moldea CLI use retained without raw output bodies
export interface ISemanticAttemptResourceEvidence {
  commandCount: number;
  maximumInvocationByteCount: number;
  modelVisibleToolOutputByteCount: number;
  operations: Array<'composition' | 'content' | 'inspect' | 'scope' | 'unrecognized' | 'validate'>;
  stdoutByteCount: number;
}

// exact published CLI identity bound to the semantic attempt
export interface ISemanticAttemptCliIdentity {
  integrity: string;
  jsonSchemaVersion: number;
  name: '@moldea.ai/cli';
  packageLockSha256: string;
  version: string;
}

// immutable evidence reference for the current semantic contract
export interface ISemanticAttemptEvidenceReference {
  evaluationProtocolVersion: 25;
  kind: 'candidate';
  path: 'evidence.json';
  schemaVersion: 10;
  sha256: string;
}

// exact immutable source identity retained when a model stage is reused
interface ISemanticAttemptStageReuseRecord<TStage extends 'actor' | 'judge'> {
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
      confirmationIndex: 1 | 2 | 3 | null;
      kind: 'confirmation' | 'initial';
    };
  };
  stage: TStage;
}

export type ISemanticFailureClassification =
  | 'semantic'
  | 'resource'
  | 'commandPolicy'
  | 'repositoryControl'
  | 'mountIntegrity'
  | 'operational';

// independently attributable trial outcomes
export interface ISemanticResultDimensions {
  semantic: boolean;
  resource: boolean;
  commandPolicy: boolean;
  repositoryControl: boolean;
  mountIntegrity: boolean;
  operational: boolean;
}

// one initial or confirmation evaluation for a semantic case
export interface ISemanticAttemptTrial {
  actorCommandPolicyEvidence: ISemanticAttemptCommandPolicyEvidence;
  actorResourceEvidence: ISemanticAttemptResourceEvidence;
  actorHost: ISemanticEvaluationActorHostIdentity;
  confirmationEligible: boolean;
  confirmationIndex: 1 | 2 | 3 | null;
  dimensions: ISemanticResultDimensions;
  evaluatedAt: string;
  executionOrigin: 'executed' | 'reused';
  forbidden: string[];
  failureClassifications: ISemanticFailureClassification[];
  judgeCommandPolicyEvidence: ISemanticAttemptCommandPolicyEvidence;
  judgeHost: ISemanticEvaluationJudgeHostIdentity;
  kind: 'confirmation' | 'initial';
  observed: string[];
  passed: boolean;
  rationale: string;
  stageReuse: {
    actor: ISemanticAttemptStageReuseRecord<'actor'>;
    judge: ISemanticAttemptStageReuseRecord<'judge'>;
  } | null;
}

// derived case status and its complete ordered trial history
export interface ISemanticAttemptCase {
  confirmationStatus: 'not-applicable' | 'not-required' | 'passed' | 'rejected' | 'required';
  id: string;
  status: 'failed' | 'passed' | 'recovered';
  trials: ISemanticAttemptTrial[];
}

// immutable public summary bound to exact current semantic evidence
export interface ISemanticAttemptRecord {
  artifactDigest: string;
  attemptId: string;
  caseSuiteDigest: string;
  cases: ISemanticAttemptCase[];
  cli: ISemanticAttemptCliIdentity;
  confirmationPolicy: Readonly<{
    version: 2;
    requiredPassingConfirmations: 2;
    requiredFailingConfirmations: 2;
    maximumConfirmations: 3;
  }>;
  coverageDigest: string;
  createdAt: string;
  evidence: ISemanticAttemptEvidenceReference;
  executedStageCount: number;
  executedTrialCount: number;
  failedCaseCount: number;
  hostContract: ISemanticEvaluationHostContract;
  passedCaseCount: number;
  pendingCaseCount: number;
  recordedAt: string;
  recoveredCaseCount: number;
  reusedStageCount: number;
  reusedTrialCount: number;
  schemaVersion: 7;
  status: ISemanticAttemptStatus;
  stopReason:
    | 'case-failure'
    | 'complete'
    | 'complete-with-failures'
    | 'confirmation-failure'
    | 'confirmations-passed'
    | 'operator-recorded';
  totalCaseCount: number;
  updatedAt: string;
}

// independently tracks the latest attempt and most recent passing attempt
export interface ISemanticLatestResult {
  lastPassingAttemptId: string | null;
  latestAttemptId: string;
  latestStatus: ISemanticAttemptStatus;
  schemaVersion: 1;
  updatedAt: string;
}

export const createSemanticAttemptRecord: (options: {
  evidence: Record<string, unknown>;
  evidenceKind: 'candidate';
  evidenceSha256: string;
  recordedAt: string;
  stopReason: ISemanticAttemptRecord['stopReason'];
  totalCaseCount: number;
}) => ISemanticAttemptRecord;
export const recordSemanticEvaluationAttempt: (options: {
  evidenceKind: 'candidate';
  evidenceText: string;
  recordedAt?: string;
  resultsRoot: string;
  stopReason: ISemanticAttemptRecord['stopReason'];
  totalCaseCount: number;
}) => Promise<ISemanticAttemptRecord>;
export const loadSemanticEvaluationAttempts: (resultsRoot: string) => Promise<{
  attempts: ISemanticAttemptRecord[];
  latest: ISemanticLatestResult | null;
}>;
export const loadVerifiedSemanticEvaluationAttempts: (resultsRoot: string) => {
  attempts: ISemanticAttemptRecord[];
  latest: ISemanticLatestResult | null;
};
export const verifySemanticEvaluationAttempts: (resultsRoot: string) => Promise<{
  attempts: number;
  issues: string[];
  passed: boolean;
}>;
import type { ICodexEvaluationCommandPolicyEvidence } from '../codex-evaluation-host/index.mjs';
