// shared fixed-model evaluation host contracts consumed by TypeScript development tooling
export const CODEX_EVALUATION_MODEL: 'gpt-5.6-sol';
export const CODEX_EVALUATION_NPM_VERSION: '11.12.1';
export const CODEX_EVALUATION_ACTOR_REASONING_EFFORT: 'high';
export const CODEX_EVALUATION_JUDGE_REASONING_EFFORT: 'xhigh';
export const CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256: string;
export const CODEX_EVALUATION_DEFAULT_ALLOWED_EGRESS_HOSTS: readonly string[];
export const CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS: number;
export const CODEX_EVALUATION_HOST_FAILURE_KINDS: {
  readonly Aborted: 'aborted';
  readonly ExecutionFailed: 'execution-failed';
  readonly OutputLimit: 'output-limit';
  readonly ProxyUnavailable: 'proxy-unavailable';
  readonly SpawnFailed: 'spawn-failed';
  readonly TimedOut: 'timed-out';
};

export type ICodexEvaluationHostFailureKind =
  (typeof CODEX_EVALUATION_HOST_FAILURE_KINDS)[keyof typeof CODEX_EVALUATION_HOST_FAILURE_KINDS];

// safe retry evidence shared by evaluation workflows
export type ICodexEvaluationOperationalRetry = {
  category: 'execution-failed' | 'proxy-unavailable' | 'timed-out';
  failedAt: string;
  failureCount: number;
  retryDelayMs: number;
};

export type ICodexEvaluationOperationalExhaustion = {
  category: 'execution-failed' | 'proxy-unavailable' | 'timed-out';
  failedAt: string;
  failureCount: number;
  maximumRetryCount: number;
};

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

export type ICodexEvaluationCommandPolicyReason = {
  code: ICodexEvaluationCommandPolicyReasonCode;
  count: number;
};

export type ICodexEvaluationCommandPolicyEvidence = {
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
};

export type ICodexEvaluationExecutionEvidence = {
  commandPolicy: ICodexEvaluationCommandPolicyEvidence;
  projectedEvents: string;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
  } | null;
};

export type IMoldeaCliOperation = 'composition' | 'content' | 'inspect' | 'scope' | 'validate';

export const identifyMoldeaCliLauncherOperation: (command: string) => IMoldeaCliOperation | null;

export type IRepositoryTestCommandKind = 'correctness' | 'e2e' | 'integration' | 'unit';

export const identifyRepositoryTestCommandKind: (
  command: string,
) => IRepositoryTestCommandKind | null;

export const isRepositoryTestCommand: (command: string) => boolean;

export class CodexEvaluationOperationalRetryExhaustedError extends Error {
  public readonly category: 'execution-failed' | 'proxy-unavailable' | 'timed-out';
  public readonly failureCount: number;
  public readonly maximumRetryCount: number;
  public constructor(
    category: 'execution-failed' | 'proxy-unavailable' | 'timed-out',
    failureCount: number,
    maximumRetryCount: number,
    options?: ErrorOptions,
  );
}

export class CodexEvaluationHostError extends Error {
  public readonly kind: ICodexEvaluationHostFailureKind;
  public constructor(
    kind: ICodexEvaluationHostFailureKind,
    message: string,
    options?: ErrorOptions,
  );
}

export type ICodexEvaluationHostConfiguration = {
  allowedEgressHosts: string[];
  hostTimeoutMs: number;
  modelEndpoint: {
    origin: string;
    sha256: string;
  } | null;
  sslCertificateFileSha256: string | null;
};

// workflow defaults used when the host environment does not provide an override
export type ICodexEvaluationHostConfigurationOptions = {
  defaultHostTimeoutMs?: number;
};

export type ICodexEvaluationHostIdentity = {
  developerInstructionsSha256: string;
  model: string;
  name: string;
  reasoningEffort: string;
  role: 'actor' | 'judge';
  version: string;
};

export type ICodexEvaluationReadOnlyMount = {
  source: string;
  target: string;
};

export type ICodexEvaluationWorkspaceAccess = 'read-only' | 'read-write';

export const buildCodexEvaluationBwrapArguments: (options: {
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
}) => string[];

export const buildCodexEvaluationHostCommand: (
  command: readonly string[],
  role: 'actor' | 'judge',
) => string[];
export const identifyCodexEvaluationHost: (
  command: readonly string[],
  role: 'actor' | 'judge',
) => ICodexEvaluationHostIdentity;
export const identifyCodexEvaluationHostConfiguration: (
  options?: ICodexEvaluationHostConfigurationOptions,
) => ICodexEvaluationHostConfiguration;
export const identifyConfiguredModel: (command: readonly string[]) => string;
export const identifyConfiguredReasoningEffort: (command: readonly string[]) => string;
export const isRetryableCodexEvaluationHostError: (error: unknown) => boolean;
export const parseCodexEvaluationHostCommand: (
  variableName: string,
  fallback?: readonly string[],
) => readonly string[];
export const prepareCodexEvaluationHome: (sandboxHome: string) => Promise<void>;
export const resolveCodeModeHostPath: (hostExecutable: string) => string;
export const runCodexEvaluationHost: (options: {
  command: readonly string[];
  cwd: string;
  defaultHostTimeoutMs?: number;
  includeWorkspaceBinaryDirectory?: boolean;
  prompt: string;
  readOnlyMounts?: readonly ICodexEvaluationReadOnlyMount[];
  readOnlyWorkspacePaths?: readonly string[];
  role: 'actor' | 'judge';
  sandboxHome: string;
  signal?: AbortSignal;
  workspaceAccess?: ICodexEvaluationWorkspaceAccess;
}) => Promise<string>;
export const validateCodexEvaluationHostCommand: (
  command: readonly string[],
  role: 'actor' | 'judge',
) => void;

export const calculateCodexEvaluationOperationalRetryDelay: (
  failureCount: number,
  randomValue?: number,
) => number;
export const projectCodexEvaluationExecutionEvidence: (
  source: string,
) => ICodexEvaluationExecutionEvidence;
export const hasPassingCodexEvaluationCommandPolicy: (
  evidence: ICodexEvaluationCommandPolicyEvidence,
) => boolean;
export const hasValidCodexEvaluationCommandPolicy: (
  evidence: unknown,
) => evidence is ICodexEvaluationCommandPolicyEvidence;
export const prepareGitCommandPolicyBoundary: (
  directoryPath: string,
  options?: {
    trustedReadOnlyDirectoryNames?: readonly string[];
  },
) => Promise<string>;
export const CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX: readonly string[];
export const CODEX_EVALUATION_GIT_STATUS_ARGUMENTS: readonly string[];
export const runCodexEvaluationOperationalStage: <T>(options: {
  initialFailureCount?: number;
  maximumRetryCount?: number;
  now?: () => string;
  onExhausted?: (exhaustion: ICodexEvaluationOperationalExhaustion) => Promise<void>;
  onRetry: (retry: ICodexEvaluationOperationalRetry) => Promise<void>;
  operation: () => Promise<T>;
  random?: () => number;
  signal?: AbortSignal;
  wait?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
}) => Promise<T>;

export const isPublicIpAddress: (address: string) => boolean;
export const parseConnectAuthority: (authority: string) => {
  host: string;
  port: number;
};
export const runCodexEvaluationProxy: () => Promise<void>;
