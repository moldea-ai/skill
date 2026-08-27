// terminal status derived from an immutable semantic attempt
export type ISemanticAttemptStatus = 'failed' | 'incomplete' | 'passed';

// behavior-bearing semantic execution contract
export interface ISemanticEvaluationHostContract {
  model: 'gpt-5.6-sol';
  name: 'codex';
  reasoningEffort: 'medium';
}

// exact non-sensitive provenance for one Codex role execution
export interface ISemanticEvaluationHostIdentity extends ISemanticEvaluationHostContract {
  version: string;
}

// aggregate command-policy evidence retained without raw command text
export interface ISemanticAttemptCommandPolicyEvidence {
  completedCommandCount: number;
  indeterminateCommandCount: number;
  packageManagerExecution: 'indeterminate' | 'not-observed' | 'observed';
  packageManagerInvocationCount: number;
}

// exact published CLI identity bound to the semantic attempt
export interface ISemanticAttemptCliIdentity {
  integrity: string;
  jsonSchemaVersion: number;
  name: '@moldea.ai/cli';
  packageLockSha256: string;
  version: string;
}

// one initial or confirmation evaluation for a semantic case
export interface ISemanticAttemptTrial {
  actorCommandPolicyEvidence: ISemanticAttemptCommandPolicyEvidence;
  actorHost: ISemanticEvaluationHostIdentity;
  confirmationIndex: 1 | 2 | null;
  evaluatedAt: string;
  forbidden: string[];
  judgeHost: ISemanticEvaluationHostIdentity;
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

// immutable public summary bound to exact current semantic evidence
export interface ISemanticAttemptRecord {
  artifactDigest: string;
  attemptId: string;
  caseSuiteDigest: string;
  cases: ISemanticAttemptCase[];
  cli: ISemanticAttemptCliIdentity;
  coverageDigest: string;
  createdAt: string;
  evidence: {
    evaluationProtocolVersion: 16 | 17;
    kind: 'candidate';
    path: 'evidence.json';
    schemaVersion: 5;
    sha256: string;
  };
  failedCaseCount: number;
  hostContract: ISemanticEvaluationHostContract;
  passedCaseCount: number;
  pendingCaseCount: number;
  recordedAt: string;
  recoveredCaseCount: number;
  schemaVersion: 4;
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
