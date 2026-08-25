// terminal status derived from an immutable semantic attempt
export type ISemanticAttemptStatus = 'failed' | 'incomplete' | 'passed';

// behavior-bearing semantic execution contract
export interface ISemanticEvaluationHostContract {
  model: 'gpt-5.6-terra';
  name: 'codex';
  reasoningEffort: 'medium';
}

// exact non-sensitive provenance for one Codex role execution
export interface ISemanticEvaluationHostIdentity extends ISemanticEvaluationHostContract {
  version: string;
}

// one initial or confirmation evaluation for a semantic case
export interface ISemanticAttemptTrialBase {
  confirmationIndex: 1 | 2 | null;
  evaluatedAt: string;
  forbidden: string[];
  kind: 'confirmation' | 'initial';
  observed: string[];
  passed: boolean;
  rationale: string;
}

// historical trial whose host identity was recorded at attempt level
export type ISemanticLegacyAttemptTrial = ISemanticAttemptTrialBase;

// current trial with independent actor and judge provenance
export interface ISemanticAttemptTrial extends ISemanticAttemptTrialBase {
  actorHost: ISemanticEvaluationHostIdentity;
  judgeHost: ISemanticEvaluationHostIdentity;
}

// derived case status and its complete ordered trial history
export interface ISemanticAttemptCase<TTrial extends ISemanticAttemptTrialBase> {
  confirmationStatus: 'not-required' | 'passed' | 'rejected' | 'required';
  id: string;
  status: 'failed' | 'passed' | 'recovered';
  trials: TTrial[];
}

// immutable fields shared by every semantic summary generation
export interface ISemanticAttemptRecordBase<TTrial extends ISemanticAttemptTrialBase> {
  artifactDigest: string;
  attemptId: string;
  caseSuiteDigest: string;
  cases: ISemanticAttemptCase<TTrial>[];
  cli: unknown;
  coverageDigest: string | null;
  createdAt: string;
  evidence: {
    evaluationProtocolVersion: number;
    kind: 'candidate' | 'result';
    path: 'evidence.json';
    schemaVersion: number;
    sha256: string;
  };
  failedCaseCount: number;
  passedCaseCount: number;
  pendingCaseCount: number;
  recordedAt: string;
  recoveredCaseCount: number;
  status: ISemanticAttemptStatus;
  stopReason:
    | 'case-failure'
    | 'complete'
    | 'confirmation-failure'
    | 'confirmations-passed'
    | 'operator-recorded';
  totalCaseCount: number;
  updatedAt: string;
}

// historical summary retained byte-for-byte for immutable evidence verification
export interface ISemanticLegacyAttemptRecord extends ISemanticAttemptRecordBase<ISemanticLegacyAttemptTrial> {
  actorHost: ISemanticEvaluationHostIdentity;
  judgeHost: ISemanticEvaluationHostIdentity;
  schemaVersion: 1;
}

// current summary with one stable contract and trial-level exact provenance
export interface ISemanticCurrentAttemptRecord extends ISemanticAttemptRecordBase<ISemanticAttemptTrial> {
  hostContract: ISemanticEvaluationHostContract;
  schemaVersion: 2;
}

// immutable public summary bound to exact raw semantic evidence
export type ISemanticAttemptRecord = ISemanticLegacyAttemptRecord | ISemanticCurrentAttemptRecord;

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
  evidenceKind: 'candidate' | 'result';
  evidenceSha256: string;
  recordedAt: string;
  stopReason: ISemanticAttemptRecord['stopReason'];
  totalCaseCount: number;
}) => ISemanticAttemptRecord;
export const recordSemanticEvaluationAttempt: (options: {
  evidenceKind: 'candidate' | 'result';
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
