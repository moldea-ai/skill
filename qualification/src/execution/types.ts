import type {
  IQualificationAttemptResult,
  IQualificationCaseResult,
  IQualificationProvenance,
  IQualificationSelection,
} from '../contracts/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import type { IGitRepositoryState } from '../repository-state/index.ts';

// options accepted by a new or resumed local qualification execution
export type IRunQualificationOptions = {
  host: ICodexHost;
  selection?: IQualificationSelection;
  skillRepository?: string;
  isDryRun?: boolean;
  useCache?: boolean;
  parentAttemptId?: string | null;
  resumeAttemptId?: string;
  resultsRoot?: string;
  signal?: AbortSignal | undefined;
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
