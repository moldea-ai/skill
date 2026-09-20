import type { IEvaluationReplayModel } from '@moldea.ai/website-ui/evaluation-replay-model';

import type { ICodexEvaluationCommandPolicyEvidence } from '../../execution/host/index.ts';
import type { ISemanticStageReuseRecord } from '../stages/index.ts';

type ISemanticCriterionContract = { criterion: string; label: string };
type ISemanticCaseContract = {
  expected: ISemanticCriterionContract[];
  forbidden: ISemanticCriterionContract[];
  hostInstructions?: string;
  id: string;
  input: { developerDirection: string; repositoryEvidence: unknown[] };
  operation: string;
  resourceBudget: {
    activation: 'abstain' | 'blocked' | 'direct' | 'informational' | 'relationship';
    maximumMoldeaCommands: number;
    maximumMoldeaOutputBytes: number;
    minimumMoldeaCommands: number;
  };
  scenario: string;
};

export type ISemanticCliIdentity = {
  integrity: string;
  jsonSchemaVersion: number;
  name: '@moldea.ai/cli';
  packageLockSha256: string;
  version: string;
};

export type ISemanticEvaluationGroupId = string;
export type ISemanticEvaluationCaseId = string;
export type ISemanticEvaluationCaseStatus = 'failed' | 'passed' | 'pending' | 'recovered';
export type ISemanticEvidenceMatch = 'exact';

// every public attempt is rendered from the selected immutable evidence bundle
export type ISemanticEvidenceSource = { kind: 'recorded' };

// reviewed visitor copy that exactly matches the loaded source and recorded case identities
export interface ISemanticCasePresentationModel {
  summary: string;
  title: string;
}

// exact actor or judge host shown with one trial
export interface ISemanticEvaluationActorHostModel {
  developerInstructionsSha256: string;
  model: string;
  name: string;
  reasoningEffort: string;
  role: 'actor';
  version: string;
}

// exact independent judge host shown with one trial
export interface ISemanticEvaluationJudgeHostModel {
  developerInstructionsSha256: string;
  model: string;
  name: string;
  reasoningEffort: string;
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

export type ISemanticHostUsage = {
  cachedInputTokens: number;
  inputTokens: number;
  outputTokens: number;
};

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
  actorUsage: ISemanticHostUsage | null;
  confirmationEligible: boolean;
  confirmationIndex: 1 | 2 | 3 | null;
  dimensions: ISemanticResultDimensions;
  evaluatedAt: string;
  executionOrigin: 'executed' | 'reused';
  forbidden: string[];
  failureClassifications: ISemanticFailureClassification[];
  judgeCommandPolicyEvidence: ICodexEvaluationCommandPolicyEvidence;
  judgeHost: ISemanticEvaluationJudgeHostModel;
  judgeUsage: ISemanticHostUsage | null;
  kind: 'confirmation' | 'initial';
  observed: string[];
  passed: boolean;
  rationale: string;
  stageReuse: {
    actor: ISemanticStageReuseRecord & { stage: 'actor' };
    judge: ISemanticStageReuseRecord & { stage: 'judge' };
  } | null;
}

export type ISemanticAttemptRecord = {
  artifactDigest: string;
  attemptId: string;
  caseSuiteDigest: string;
  cases: Array<{
    confirmationStatus: 'not-applicable' | 'not-required' | 'passed' | 'rejected' | 'required';
    id: string;
    status: ISemanticEvaluationCaseStatus;
    trials: ISemanticAttemptTrialModel[];
  }>;
  cli: ISemanticCliIdentity;
  confirmationPolicy: {
    maximumConfirmations: 3;
    requiredFailingConfirmations: 2;
    requiredPassingConfirmations: 2;
    version: 2;
  };
  coverageDigest: string;
  createdAt: string;
  evidence: {
    evaluationProtocolVersion: number;
    kind: 'candidate';
    path: string;
    schemaVersion: number;
    sha256: string;
  };
  executedStageCount: number;
  executedTrialCount: number;
  failedCaseCount: number;
  hostContract: {
    actor: Omit<ISemanticEvaluationActorHostModel, 'version'>;
    judge: Omit<ISemanticEvaluationJudgeHostModel, 'version'>;
  };
  passedCaseCount: number;
  pendingCaseCount: number;
  recordedAt: string;
  recoveredCaseCount: number;
  reusedStageCount: number;
  reusedTrialCount: number;
  schemaVersion: number;
  status: 'failed' | 'incomplete' | 'passed';
  stopReason: string;
  totalCaseCount: number;
  updatedAt: string;
};

type ISemanticLatestResult = {
  lastPassingAttemptId: string | null;
  latestAttemptId: string;
  latestStatus: ISemanticAttemptRecord['status'];
  schemaVersion: 1;
  updatedAt: string;
};

// semantic contracts consumed directly from the repository-owned evaluator
export type ISemanticCriterion = ISemanticCriterionContract;
export type ISemanticCaseDefinition = ISemanticCaseContract;

// current case state derived from the exact current-contract attempt
export interface ISemanticEvaluationCaseModel {
  confirmationStatus: ISemanticAttemptRecord['cases'][number]['confirmationStatus'] | null;
  developerDirection: string | null;
  evaluatedAt: string | null;
  expectedCriteria: ISemanticCriterion[];
  forbiddenCriteria: ISemanticCriterion[];
  groupId: ISemanticEvaluationGroupId | null;
  hasCurrentCaseDefinition: boolean;
  id: string;
  presentation: ISemanticCasePresentationModel | null;
  rationale: string | null;
  replay: IEvaluationReplayModel | null;
  scenario: string;
  summary: string;
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
  evidenceSource: ISemanticEvidenceSource;
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
