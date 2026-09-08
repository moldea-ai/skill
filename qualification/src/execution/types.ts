import type {
  IQualificationAttemptCheckpoint,
  IQualificationAttemptResult,
  IQualificationCaseResult,
  IQualificationExecutionEnvironment,
  IQualificationProvenance,
  IQualificationResourceProfile,
  IQualificationSelection,
  IQualificationTrialResult,
} from '../contracts/index.ts';
import type {
  ICodexEvaluationOperationalExhaustion,
  ICodexEvaluationOperationalRetry,
} from '../../../tooling/codex-evaluation-host/index.mjs';
import type { ICodexHost } from '../codex-host/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';

// options accepted by a new or resumed local qualification execution
export type IRunQualificationOptions = {
  host: ICodexHost;
  selection?: IQualificationSelection;
  caseId?: string;
  initialCandidateTokensConsumed?: number;
  mode?: 'diagnostic' | 'dry-run' | 'official';
  newAttemptId?: string;
  packagesRepository?: string;
  skillRepository?: string;
  isDryRun?: boolean;
  reuseEvidence?: boolean;
  parentAttemptId?: string | null;
  resumeAttemptId?: string;
  resumeStoppedStage?: boolean;
  resultsRoot?: string;
  requestPaidExecutionApproval?: (request: IQualificationPaidExecutionRequest) => Promise<boolean>;
  onProgress?: (progress: IQualificationProgress) => Promise<void> | void;
  operationalRetry?: IQualificationOperationalRetryOptions;
  signal?: AbortSignal | undefined;
};

// exact cost boundary presented immediately before the first direct model call
export type IQualificationPaidExecutionRequest = {
  candidateTokensConsumed: number;
  directCaseCount: number;
  maximumCallCount: number;
  maximumTokenCount: number;
  maximumTokensPerCall: number;
  plannedCallCount: number;
  reusedCaseCount: number;
  model: IQualificationExecutionEnvironment['model'];
  reasoningEffort: IQualificationExecutionEnvironment['reasoningEffort'];
};

// timing seams keep operational retry integration tests deterministic and fast
export type IQualificationOperationalRetryOptions = {
  now?: () => string;
  random?: () => number;
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
};

// safe operator progress emitted independently from JSON stdout
export type IQualificationProgress =
  | {
      kind: 'operational-stop';
      caseId: string;
      role: 'actor' | 'judge';
      stageId: string;
      stop: ICodexEvaluationOperationalExhaustion;
      trialId: IQualificationTrialResult['trialId'];
    }
  | {
      kind: 'operational-retry';
      caseId: string;
      retry: ICodexEvaluationOperationalRetry;
      role: 'actor' | 'judge';
      stageId: string;
      trialId: IQualificationTrialResult['trialId'];
    }
  | {
      kind: 'trial';
      caseId: string;
      passed?: boolean;
      status: 'completed' | 'started';
      trialId: IQualificationTrialResult['trialId'];
    };

export type IQualificationRunOutcome = {
  attemptDirectory: string;
  result: IQualificationAttemptResult;
  wasRecorded: boolean;
};

// local checkpoints that the current runner cannot safely operate on
export type IUnavailableLocalAttempt = {
  attemptId: string;
  kind: 'invalid-checkpoint' | 'unreadable-checkpoint' | 'unsupported-protocol';
  message: string;
  protocolVersion: number | null;
};

// non-mutating discovery result used by status and interactive recovery
export type ILocalAttemptCheckpointInspection = {
  attempts: IQualificationAttemptCheckpoint[];
  unavailableAttempts: IUnavailableLocalAttempt[];
};

// immutable tool and repository identity assembled before candidate execution
export type IQualificationExecutionProvenance = Omit<IQualificationProvenance, 'packages'>;

// source repositories that determine one attempt's reproducible input identity
export type IQualificationInputState = {
  modelHostDigest: string;
  packagesDigest: string;
  packagesState: IGitRepositoryState;
  qualificationBaselineDigest: string;
  qualificationDigest: string;
  qualificationState: IGitRepositoryState;
  skillState: IGitRepositoryState;
};

// accumulated case results used to build pass, fail, error, and incomplete records
export type IQualificationExecutionState = {
  caseResults: IQualificationCaseResult[];
  provenance: IQualificationExecutionProvenance;
};

// stable dimensions used to classify one operating-profile violation
export type IQualificationResourceDimension =
  | 'completed-host-commands'
  | 'maximum-command-output-bytes'
  | 'model-visible-tool-output-bytes'
  | 'moldea-commands'
  | 'moldea-output-bytes'
  | 'total-model-tokens';

// typed resource violation retained independently from its display message
export type IQualificationResourceViolation = {
  dimension: IQualificationResourceDimension;
  kind: 'exceeded' | 'unavailable';
  limit: number;
  observed: number | null;
};

// runner decision derived from one stage's scenario-owned operating profile
export type IQualificationResourceAssessment = {
  failures: string[];
  hasJudgeBlocker: boolean;
  violations: IQualificationResourceViolation[];
};

// resource profiles keyed by the scenario contract value
export type IQualificationResourceProfiles = Record<
  'largeTraversal' | 'ordinary',
  IQualificationResourceProfile
>;
