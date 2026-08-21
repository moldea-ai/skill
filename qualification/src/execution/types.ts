import type {
  IQualificationAttemptResult,
  IQualificationCaseResult,
  IQualificationExecutionEnvironment,
  IQualificationProvenance,
  IQualificationSelection,
} from '../contracts/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';

// options accepted by a new or resumed local qualification execution
export type IRunQualificationOptions = {
  host: ICodexHost;
  selection?: IQualificationSelection;
  packagesRepository?: string;
  skillRepository?: string;
  isDryRun?: boolean;
  useCache?: boolean;
  parentAttemptId?: string | null;
  resumeAttemptId?: string;
  resultsRoot?: string;
  requestPaidExecutionApproval?: (request: IQualificationPaidExecutionRequest) => Promise<boolean>;
  signal?: AbortSignal | undefined;
};

// exact cost boundary presented immediately before the first uncached model call
export type IQualificationPaidExecutionRequest = {
  model: IQualificationExecutionEnvironment['model'];
  modelCallCount: number;
  reasoningEffort: IQualificationExecutionEnvironment['reasoningEffort'];
};

export type IQualificationRunOutcome = {
  attemptDirectory: string;
  result: IQualificationAttemptResult;
  wasRecorded: boolean;
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
