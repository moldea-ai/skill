// shared fixed-model evaluation host contracts consumed by TypeScript development tooling
export const CODEX_EVALUATION_MODEL: 'gpt-5.6-sol';
export const CODEX_EVALUATION_NPM_VERSION: '11.12.1';
export const CODEX_EVALUATION_REASONING_EFFORT: 'medium';
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

export type ICodexEvaluationCommandPolicyStatus = 'indeterminate' | 'not-observed' | 'observed';

export type ICodexEvaluationCommandPolicyEvidence = {
  completedCommandCount: number;
  credentialExposure: {
    status: 'not-observed' | 'observed';
    observedCount: number;
  };
  networkAccess: {
    status: ICodexEvaluationCommandPolicyStatus;
    observedCount: number;
    indeterminateCount: number;
  };
  sensitiveAccess: {
    status: ICodexEvaluationCommandPolicyStatus;
    observedCount: number;
    indeterminateCount: number;
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
  model: string;
  name: string;
  reasoningEffort: string;
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

export const buildCodexEvaluationHostCommand: (command: readonly string[]) => string[];
export const identifyCodexEvaluationHost: (
  command: readonly string[],
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
  sandboxHome: string;
  signal?: AbortSignal;
  workspaceAccess?: ICodexEvaluationWorkspaceAccess;
}) => Promise<string>;
export const validateCodexEvaluationHostCommand: (command: readonly string[]) => void;

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
export const prepareGitCommandPolicyBoundary: (
  directoryPath: string,
  options?: {
    trustedReadOnlyDirectoryNames?: readonly string[];
  },
) => Promise<string>;
export const runCodexEvaluationOperationalStage: <T>(options: {
  initialFailureCount?: number;
  maximumRetryCount?: number;
  now?: () => string;
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
