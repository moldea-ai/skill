import type {
  ICodexEvaluationHostIdentity,
  ICodexEvaluationOperationalFailureCategory,
} from '../../execution/host/index.ts';
import type { ISemanticActorExecutionEvidence, ISemanticHostOutput } from '../execution/index.ts';
import type { ISemanticAttemptTrialModel, ISemanticCliIdentity } from '../public-evidence/index.ts';
import type { ISemanticWorkspaceChanges } from '../workspace/index.ts';

export type ISemanticEvaluationMode = 'diagnostic' | 'official';

export interface ISemanticOperationalFailureRecord {
  category: ICodexEvaluationOperationalFailureCategory;
  failedAt: string;
  isExhausted: boolean;
  stage: 'actor' | 'judge';
}

export interface ISemanticOperationalRetryState {
  actorFailureCount: number;
  judgeFailureCount: number;
  lastFailure: ISemanticOperationalFailureRecord | null;
}

export interface ISemanticActiveTrialActorEvidence extends ISemanticHostOutput {
  actorStageIdentitySha256: string;
  isMountIntegrityPassing: boolean;
  isRepositoryControlPassing: boolean;
  workspaceChanges: ISemanticWorkspaceChanges;
}

export interface ISemanticActiveTrialCheckpoint {
  actorEvidence: ISemanticActiveTrialActorEvidence | null;
  confirmationIndex: 1 | 2 | 3 | null;
  operationalRetries: ISemanticOperationalRetryState;
  phase: 'actor-pending' | 'judge-pending' | 'trial-complete';
  recordedTrial: ISemanticRecordedTrial | null;
  startedAt: string;
  updatedAt: string;
}

export interface ISemanticCaseCheckpoint {
  activeTrial: ISemanticActiveTrialCheckpoint | null;
  caseDefinitionDigest: string;
  caseId: string;
  completedCase: ISemanticRecordedCase | null;
  trials: ISemanticRecordedTrial[];
}

export interface ISemanticRecordedTrial {
  actorExecutionEvidence: ISemanticActorExecutionEvidence[];
  actorResponse: string;
  developerDirection: string;
  operationalRetries: ISemanticOperationalRetryState;
  stageIdentities: {
    actorSha256: string;
    judgeSha256: string;
  };
  trial: ISemanticAttemptTrialModel;
  workspaceChanges: ISemanticWorkspaceChanges;
}

export interface ISemanticReusableTrial {
  caseId: string;
  recordedTrial: ISemanticRecordedTrial;
  sourceAttemptId: string;
  sourceEvidenceSha256: string;
}

export interface ISemanticRecordedCase {
  confirmationStatus: 'not-applicable' | 'not-required' | 'passed' | 'rejected' | 'required';
  id: string;
  status: 'failed' | 'passed' | 'pending' | 'recovered';
  trials: ISemanticRecordedTrial[];
}

export interface ISemanticCandidateCheckpoint {
  actorHost: ICodexEvaluationHostIdentity;
  artifactDigest: string;
  attemptId: string;
  caseCheckpoints: Record<string, ISemanticCaseCheckpoint>;
  caseSuiteDigest: string;
  cases: ISemanticRecordedCase[];
  cli: ISemanticCliIdentity;
  coverageDigest: string;
  createdAt: string;
  judgeHost: ICodexEvaluationHostIdentity;
  mode: ISemanticEvaluationMode;
  schemaVersion: 2;
  selectedCaseIds: string[];
  updatedAt: string;
}
