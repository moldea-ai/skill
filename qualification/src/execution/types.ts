import type {
  IQualificationAttemptCheckpoint,
  IQualificationAttemptResult,
  IQualificationCaseResult,
  IQualificationExecutionEnvironment,
  IQualificationProvenance,
  IQualificationSelection,
  IQualificationTrialResult,
} from '../contracts/index.ts';
import type { ICodexEvaluationOperationalRetry } from '../../../tooling/codex-evaluation-host/index.mjs';
import type { ICodexHost } from '../codex-host/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';

// options accepted by a new or resumed local qualification execution
export type IRunQualificationOptions = {
  host: ICodexHost;
  selection?: IQualificationSelection;
  caseId?: string;
  mode?: 'diagnostic' | 'dry-run' | 'official';
  packagesRepository?: string;
  skillRepository?: string;
  isDryRun?: boolean;
  useCache?: boolean;
  parentAttemptId?: string | null;
  resumeAttemptId?: string;
  resultsRoot?: string;
  requestPaidExecutionApproval?: (request: IQualificationPaidExecutionRequest) => Promise<boolean>;
  onProgress?: (progress: IQualificationProgress) => Promise<void> | void;
  operationalRetry?: IQualificationOperationalRetryOptions;
  signal?: AbortSignal | undefined;
};

// exact cost boundary presented immediately before the first uncached model call
export type IQualificationPaidExecutionRequest = {
  maximumCallCount: number;
  plannedCallCount: number;
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
  packagesDigest: string;
  packagesState: IGitRepositoryState;
  qualificationDigest: string;
  qualificationState: IGitRepositoryState;
  skillState: IGitRepositoryState;
};

// accumulated case results used to build pass, fail, error, and incomplete records
export type IQualificationExecutionState = {
  caseResults: IQualificationCaseResult[];
  provenance: IQualificationExecutionProvenance;
};
