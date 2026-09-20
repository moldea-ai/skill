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

export interface ICodexEvaluationCommandPolicyEvidence {
  completedCommandCount: number;
  credentialExposure: {
    status: 'not-observed' | 'observed';
    observedCount: number;
    reasons: ICodexEvaluationCommandPolicyReason[];
  };
  maximumCommandOutputByteCount: number;
  modelVisibleToolOutputByteCount: number;
  moldeaCommandCount: number;
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
export type IRepositoryTestCommandKind = 'correctness' | 'e2e' | 'integration' | 'unit';

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

export interface ICodexEvaluationHostRunOptions {
  command: readonly string[];
  cwd: string;
  defaultHostTimeoutMs?: number;
  includeWorkspaceBinaryDirectory?: boolean;
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
