// terminal status derived from an immutable semantic attempt
export type ISemanticAttemptStatus = 'failed' | 'incomplete' | 'passed';

// one initial or confirmation evaluation for a semantic case
export interface ISemanticAttemptTrial {
  confirmationIndex: 1 | 2 | null;
  evaluatedAt: string;
  forbidden: string[];
  kind: 'confirmation' | 'initial';
  observed: string[];
  passed: boolean;
  rationale: string;
}

// derived case status and its complete ordered trial history
export interface ISemanticAttemptCase {
  confirmationStatus: 'not-required' | 'passed' | 'rejected' | 'required';
  id: string;
  status: 'failed' | 'passed' | 'recovered';
  trials: ISemanticAttemptTrial[];
}

// immutable public summary bound to exact raw semantic evidence
export interface ISemanticAttemptRecord {
  actorHost: unknown;
  artifactDigest: string;
  attemptId: string;
  caseSuiteDigest: string;
  cases: ISemanticAttemptCase[];
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
  judgeHost: unknown;
  passedCaseCount: number;
  pendingCaseCount: number;
  recordedAt: string;
  recoveredCaseCount: number;
  schemaVersion: 1;
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
