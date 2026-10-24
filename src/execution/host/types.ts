export type ICodexEvaluationRole = 'actor' | 'judge';
export type ICodexEvaluationOperationalFailureCategory =
  'execution-failed' | 'proxy-unavailable' | 'timed-out';

export type ICodexEvaluationHostFailureKind =
  | 'aborted'
  | 'execution-failed'
  | 'output-limit'
  | 'proxy-unavailable'
  | 'spawn-failed'
  | 'timed-out';

export interface ICodexEvaluationOperationalRetry {
  category: ICodexEvaluationOperationalFailureCategory;
  failedAt: string;
  failureCount: number;
  retryDelayMs: number;
}

export interface ICodexEvaluationOperationalExhaustion {
  category: ICodexEvaluationOperationalFailureCategory;
  failedAt: string;
  failureCount: number;
  maximumRetryCount: number;
}

export type ICodexEvaluationCommandPolicyStatus = 'indeterminate' | 'not-observed' | 'observed';
export type ICodexEvaluationCommandPolicyReasonCode =
  | 'broad-filesystem-read'
  | 'credential-material'
  | 'dynamic-execution'
  | 'environment-dump'
  | 'environment-value-read'
  | 'evaluator-auth-file'
  | 'evaluator-home'
  | 'git-network'
  | 'network-client'
  | 'oversized-command'
  | 'package-manager-network'
  | 'process-environment'
  | 'unclassified-command';

export interface ICodexEvaluationCommandPolicyReason {
  code: ICodexEvaluationCommandPolicyReasonCode;
  count: number;
}

// content-free diagnostics for commands shaped like the bundled CLI launcher
export type IMoldeaCliLauncherMissReasonCode =
  'unrecognized-node-path' | 'unrecognized-launcher-path';

export interface IMoldeaCliLauncherMissReason {
  code: IMoldeaCliLauncherMissReasonCode;
  count: number;
}

/*
 * who a completed host command works for: the moldea launcher, a bundled skill helper, a read or
 * write of the repository's moldea/ directory, a project test/build/Git/package-manager command,
 * or any other source read; resource profiles decide which of these count as moldea's own work
 */
export type ICodexEvaluationCommandOwnership =
  'canonical' | 'cli' | 'helper' | 'project' | 'source';

// completed-command totals for one ownership class
export interface ICodexEvaluationOwnedCommandTotals {
  commandCount: number;
  maximumOutputByteCount: number;
  outputByteCount: number;
}

// one content-free moldea event, in the order Codex completed it
export type ICodexEvaluationMoldeaEvent =
  | {
      kind: 'command';
      operation: IMoldeaCliOperation | null;
      outputByteCount: number;
      ownership: 'canonical' | 'cli' | 'helper';
    }
  | { kind: 'file-change'; moldeaPath: 'not-touching' | 'touching' | 'unreadable' };

export interface ICodexEvaluationCommandPolicyEvidence {
  commandOwnership: Record<ICodexEvaluationCommandOwnership, ICodexEvaluationOwnedCommandTotals>;
  completedCommandCount: number;
  credentialExposure: {
    status: 'not-observed' | 'observed';
    observedCount: number;
    reasons: ICodexEvaluationCommandPolicyReason[];
  };
  maximumCommandOutputByteCount: number;
  modelVisibleToolOutputByteCount: number;
  moldeaCommandCount: number;
  moldeaEvents: ICodexEvaluationMoldeaEvent[];
  moldeaLauncherMissReasons: IMoldeaCliLauncherMissReason[];
  moldeaOutputByteCount: number;
  networkAccess: {
    status: ICodexEvaluationCommandPolicyStatus;
    observedCount: number;
    indeterminateCount: number;
    reasons: ICodexEvaluationCommandPolicyReason[];
  };
  sensitiveAccess: {
    status: ICodexEvaluationCommandPolicyStatus;
    observedCount: number;
    indeterminateCount: number;
    reasons: ICodexEvaluationCommandPolicyReason[];
  };
}

export interface ICodexEvaluationExecutionEvidence {
  commandPolicy: ICodexEvaluationCommandPolicyEvidence;
  projectedEvents: string;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  } | null;
}

export type IMoldeaCliOperation = 'composition' | 'content' | 'inspect' | 'scope' | 'validate';
// closed operation modes of the installed AGENTS.md and Claude Code integration helper
export type IMoldeaManagedAgentsMode = 'claude-print' | 'claude-write' | 'print' | 'write';
export type IRepositoryTestCommandKind = 'e2e' | 'integration' | 'unit';

export interface ICodexEvaluationHostConfiguration {
  allowedEgressHosts: string[];
  hostTimeoutMs: number;
  modelEndpoint: { origin: string; sha256: string } | null;
  sslCertificateFileSha256: string | null;
}

export interface ICodexEvaluationHostConfigurationOptions {
  defaultHostTimeoutMs?: number;
}

export interface ICodexEvaluationHostIdentity {
  developerInstructionsSha256: string;
  model: string;
  name: string;
  reasoningEffort: string;
  role: ICodexEvaluationRole;
  version: string;
}

export interface ICodexEvaluationReadOnlyMount {
  source: string;
  target: string;
}

export type ICodexEvaluationWorkspaceAccess = 'read-only' | 'read-write';

// trusted runner destinations; these options never enter recorded evidence
export interface ICodexEvaluationPrivateTraceOptions {
  repositoryRoot: string;
  attemptId: string;
  caseId: string;
  invocation: string;
}

export interface ICodexEvaluationHostRunOptions {
  // only authored multi-request actor trials retain a session
  actorSession?: { kind: 'start' } | { kind: 'resume'; sessionId: string };
  command: readonly string[];
  cwd: string;
  defaultHostTimeoutMs?: number;
  includeWorkspaceBinaryDirectory?: boolean;
  privateTrace?: ICodexEvaluationPrivateTraceOptions;
  prompt: string;
  readOnlyMounts?: readonly ICodexEvaluationReadOnlyMount[];
  readOnlyWorkspacePaths?: readonly string[];
  role: ICodexEvaluationRole;
  sandboxHome: string;
  signal?: AbortSignal;
  workspaceAccess?: ICodexEvaluationWorkspaceAccess;
}

export interface ICodexEvaluationBwrapOptions {
  command: readonly string[];
  cwd: string;
  hostCompanionExecutable?: string;
  hostExecutable: string;
  includeWorkspaceBinaryDirectory?: boolean;
  nodeExecutable?: string;
  readOnlyMounts?: readonly ICodexEvaluationReadOnlyMount[];
  readOnlyWorkspacePaths?: readonly string[];
  sandboxHome: string;
  statusFileDescriptor?: number;
  workspaceAccess?: ICodexEvaluationWorkspaceAccess;
}

export interface ICodexEvaluationOperationalStageOptions<T> {
  initialFailureCount?: number;
  maximumRetryCount?: number;
  now?: () => string;
  onExhausted?: (exhaustion: ICodexEvaluationOperationalExhaustion) => Promise<void>;
  onRetry: (retry: ICodexEvaluationOperationalRetry) => Promise<void>;
  operation: () => Promise<T>;
  random?: () => number;
  signal?: AbortSignal;
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
}

// finite diagnostics disclose command categories, never arguments, refs or paths
export type IRepairGitReasonCode =
  | 'git-rev-parse'
  | 'git-log'
  | 'git-show'
  | 'git-status-arguments'
  | 'git-diff-arguments'
  | 'git-other'
  | 'untrusted-git'
  | 'unparsed-shell'
  | 'opaque-node'
  | 'opaque-shell'
  | 'opaque-command';

// bounded repair Git observations from one captured command, without its text
export interface IRepairGitCommandEvidence {
  compliantCount: number;
  noncompliantCount: number;
  unverifiedCount: number;
  reasons: Array<{ code: IRepairGitReasonCode; count: number }>;
}
