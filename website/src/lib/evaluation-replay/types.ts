// roles supported by reusable evaluation replay messages
export type IEvaluationReplayRole =
  'coding-agent' | 'developer' | 'deterministic-verifier' | 'independent-judge';

// ordered presentation steps supported by the shared replay renderer
export type IEvaluationReplayStep =
  | IEvaluationReplayCommandStep
  | IEvaluationReplayMessageStep
  | IEvaluationReplayVerdictStep
  | IEvaluationReplayWorkspaceStep;

// one exact or deterministically normalized replay message
export interface IEvaluationReplayMessageStep {
  content: string;
  kind: 'message';
  role: IEvaluationReplayRole;
  source: 'derived' | 'recorded';
}

// one safe command result or a contiguous aggregate of unprojected commands
export interface IEvaluationReplayCommandStep {
  commandCount: number;
  exitCode: number | null;
  isAggregate: boolean;
  kind: 'command';
  operation: string;
  results: string[];
  status: 'failed' | 'passed';
}

// path statuses and entry types retained in the public workspace projection
export type IEvaluationReplayWorkspaceChangeStatus = 'created' | 'deleted' | 'modified';
export type IEvaluationReplayWorkspaceEntryType = 'file' | 'symlink';

// one recorded workspace path without contents or filesystem metadata
export interface IEvaluationReplayWorkspaceChange {
  path: string;
  type: IEvaluationReplayWorkspaceEntryType;
}

// one structural folder or recorded path in a workspace tree
export interface IEvaluationReplayPathTreeNode {
  changeCount: number;
  children: IEvaluationReplayPathTreeNode[];
  kind: 'file' | 'folder' | 'symlink';
  name: string;
  path: string;
}

// one complete path-only workspace delta
export interface IEvaluationReplayWorkspaceStep {
  groups: Array<{
    changes: IEvaluationReplayWorkspaceChange[];
    status: IEvaluationReplayWorkspaceChangeStatus;
    tree: IEvaluationReplayPathTreeNode[];
  }>;
  kind: 'workspace';
}

// one deterministic trial outcome
export interface IEvaluationReplayVerdictStep {
  kind: 'verdict';
  rationale: string;
  role: Extract<IEvaluationReplayRole, 'deterministic-verifier' | 'independent-judge'>;
  source: 'derived' | 'recorded';
  status: 'failed' | 'passed';
}

// ordered replay of one initial or confirmation trial
export interface IEvaluationReplayTrial {
  confirmationIndex: 1 | 2 | null;
  evaluatedAt: string;
  id: string;
  kind: 'confirmation' | 'initial';
  steps: IEvaluationReplayStep[];
  title: string;
}

// evidence-grounded reconstruction shown for one evaluation scenario
export interface IEvaluationReplayModel {
  trials: IEvaluationReplayTrial[];
}
