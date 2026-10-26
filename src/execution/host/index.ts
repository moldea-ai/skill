// types
export type {
  ICodexEvaluationBwrapOptions,
  ICodexEvaluationCommandOwnership,
  ICodexEvaluationCommandPolicyEvidence,
  ICodexEvaluationCommandPolicyReason,
  ICodexEvaluationCommandPolicyReasonCode,
  ICodexEvaluationCommandPolicyStatus,
  ICodexEvaluationExecutionEvidence,
  ICodexEvaluationHostConfiguration,
  ICodexEvaluationHostConfigurationOptions,
  ICodexEvaluationHostFailureKind,
  ICodexEvaluationHostIdentity,
  ICodexEvaluationHostRunOptions,
  ICodexEvaluationPrivateTraceOptions,
  ICodexEvaluationMoldeaEvent,
  ICodexEvaluationMoldeaOperation,
  ICodexEvaluationOperationalExhaustion,
  ICodexEvaluationOperationalFailureCategory,
  ICodexEvaluationOperationalRetry,
  ICodexEvaluationOperationalStageOptions,
  ICodexEvaluationOwnedCommandTotals,
  ICodexEvaluationReadOnlyMount,
  ICodexEvaluationRole,
  ICodexEvaluationWorkspaceAccess,
  IMoldeaCliOperation,
  IMoldeaManagedAgentsMode,
  IMoldeaCliLauncherMissReason,
  IMoldeaCliLauncherMissReasonCode,
  IRepositoryTestCommandKind,
  IRepairGitCommandEvidence,
  IRepairGitReasonCode,
} from './types.ts';

// constants
export {
  CODEX_EVALUATION_ACTOR_REASONING_EFFORT,
  CODEX_EVALUATION_DEFAULT_ALLOWED_EGRESS_HOSTS,
  CODEX_EVALUATION_DEFAULT_HOST_TIMEOUT_MS,
  CODEX_EVALUATION_DEVELOPER_INSTRUCTIONS_SHA256,
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CODEX_EVALUATION_JUDGE_REASONING_EFFORT,
  CODEX_EVALUATION_MODEL,
  CODEX_EVALUATION_NPM_VERSION,
} from './host.ts';

// host execution
export {
  CodexEvaluationHostError,
  buildCodexEvaluationBwrapArguments,
  buildCodexEvaluationHostCommand,
  identifyCodexEvaluationHost,
  identifyCodexEvaluationHostConfiguration,
  identifyConfiguredModel,
  identifyConfiguredReasoningEffort,
  isRetryableCodexEvaluationHostError,
  parseCodexEvaluationHostCommand,
  prepareCodexEvaluationHome,
  resolveCodeModeHostPath,
  runCodexEvaluationHost,
  validateCodexEvaluationHostCommand,
} from './host.ts';

// operational retry
export {
  calculateCodexEvaluationOperationalRetryDelay,
  CodexEvaluationOperationalRetryExhaustedError,
  runCodexEvaluationOperationalStage,
} from './operational-retry.ts';

// execution evidence
export {
  correlateToolInvocations,
  hasPassingCodexEvaluationCommandPolicy,
  hasValidCodexEvaluationCommandPolicy,
  identifyMoldeaCliLauncherOperation,
  identifyMoldeaRelevanceGateMode,
  identifyMoldeaManagedAgentsMode,
  identifyManagedAgentsInvocationMode,
  identifyMoldeaRepairGitMode,
  identifyRepositoryTestCommandKinds,
  isMoldeaManagedReadmeWriterCommand,
  isRepositoryTestCommand,
  hasValidRepairGitCommandEvidence,
  projectCodexEvaluationExecutionEvidence,
  projectMoldeaInvocationOperations,
  projectRepairGitCommandEvidence,
} from './execution-evidence.ts';

// Git command-policy boundary
export {
  CODEX_EVALUATION_GIT_DIFF_ARGUMENTS_PREFIX,
  CODEX_EVALUATION_GIT_STATUS_ARGUMENTS,
  prepareGitCommandPolicyBoundary,
  isApprovedRepairGitArguments,
} from './git-command-policy-boundary.ts';

// restricted proxy
export { isPublicIpAddress, parseConnectAuthority, runCodexEvaluationProxy } from './proxy.ts';

// cooperative Git invocation capture
export { GitInvocationEventSchema, GitInvocationEvidenceSchema } from './git-invocations.ts';
export type { IGitInvocationEvidence } from './git-invocations.ts';

// cooperative Node-startup CLI capture
export {
  CliInvocationEventSchema,
  identifyCliInvocationOperation,
  isMoldeaCliOperation,
  MOLDEA_CLI_OPERATIONS,
} from './cli-invocations/index.ts';
export type { ICliInvocation, ICliInvocationEvent } from './cli-invocations/index.ts';
