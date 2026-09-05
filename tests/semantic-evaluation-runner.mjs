import { createHash } from 'node:crypto';
import { accessSync, constants, existsSync, readFileSync, realpathSync } from 'node:fs';
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
  CODEX_EVALUATION_MODEL,
  CODEX_EVALUATION_NPM_VERSION,
  CODEX_EVALUATION_REASONING_EFFORT,
  CodexEvaluationHostError,
  buildCodexEvaluationHostCommand,
  identifyCodexEvaluationHost,
  parseCodexEvaluationHostCommand,
  prepareCodexEvaluationHome,
  projectCodexEvaluationExecutionEvidence,
  runCodexEvaluationOperationalStage,
  runCodexEvaluationHost,
} from '../tooling/codex-evaluation-host/index.mjs';
import {
  createSemanticCliIdentity,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from '../tooling/release-identity/index.mjs';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../tooling/resource-calibration/profiles.mjs';
import {
  captureRepositoryControlState,
  classifyActorCommandPolicyEvent,
  collectScenarioEvidence,
  createActorCommandPolicyEvidence,
  createMoldeaResourceEvidence,
  createPortableSkillDigest,
  createRepositoryControlEvidence,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  createSemanticCoverageDigest,
  getSemanticCriterionLabels,
  hasPassingMoldeaResourceBudget,
  hasValidActorCommandPolicyEvidence,
  hasValidActorExecutionEvidence,
  hasValidMoldeaResourceEvidence,
  hasValidRepositoryControlEvidence,
  hasValidScenarioEvidence,
  projectActorExecutionEvidenceEvent,
  recordSemanticEvaluationAttempt,
  validateSemanticCoverage,
  validateSemanticCaseDefinition,
  verifySemanticEvaluationAttempts,
} from '../tooling/semantic-evaluation/index.mjs';

export {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  getSemanticCriterionLabels,
  validateSemanticCaseDefinition,
} from '../tooling/semantic-evaluation/index.mjs';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTABLE_SKILL_ROOT = join(REPOSITORY_ROOT, 'moldea');
const CASES_PATH = join(REPOSITORY_ROOT, 'fixtures', 'conformance-cases.json');
const RESULT_PATH = join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-result.json');
const COVERAGE_PATH = join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-coverage.json');
const ATTEMPT_RESULTS_ROOT = join(REPOSITORY_ROOT, 'fixtures', 'semantic-evaluation-results');
const CANDIDATE_RESULT_PATH = join(
  REPOSITORY_ROOT,
  'fixtures',
  '.semantic-evaluation-candidate.json',
);
const ROOT_NODE_MODULES = realpathSync(join(REPOSITORY_ROOT, 'node_modules'));
const PUBLISHED_CLI_ROOT = join(ROOT_NODE_MODULES, '@moldea.ai', 'cli');
const PUBLISHED_CLI_MANIFEST = JSON.parse(
  readFileSync(join(PUBLISHED_CLI_ROOT, 'package.json'), 'utf8'),
);
const EXCLUDED_SNAPSHOT_NAMES = new Set(['.agents', '.git']);
const MAX_WORKSPACE_EVIDENCE_FILE_BYTES = 32_768;
const SEMANTIC_CHECKPOINT_SCHEMA_VERSION = 7;
const SEMANTIC_MAXIMUM_OPERATIONAL_RETRY_COUNT = 1;
const SEMANTIC_MODEL_CALLS_PER_TRIAL = 2;
const SEMANTIC_MAXIMUM_TRIALS_PER_CASE = 3;
const SEMANTIC_CANDIDATE_KEYS = new Set([
  'activeTrial',
  'artifactDigest',
  'caseSuiteDigest',
  'cli',
  'confirmations',
  'coverageDigest',
  'evaluationProtocolVersion',
  'generatedAt',
  'hostContract',
  'results',
  'schemaVersion',
  'updatedAt',
]);
const EXCLUDED_CONTEXT_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const RETRYABLE_HOST_FAILURE_KINDS = new Set([
  CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
  CODEX_EVALUATION_HOST_FAILURE_KINDS.ProxyUnavailable,
  CODEX_EVALUATION_HOST_FAILURE_KINDS.TimedOut,
]);
// semantic cases that use scenario-specific setup instead of the adopted npm fixture
const CUSTOM_SETUP_CASE_IDS = new Set(['host-plan-command-precedence']);
const UNINITIALIZED_CASE_IDS = new Set([
  'explicit-initialization',
  'preinit-canonical-looking-review',
  'preinit-explicit-validation',
  'preinit-information',
]);

/** Identifies the CLI source owned by one semantic evaluation scenario. */
export const getSemanticToolingSource = (caseId) => {
  if (CUSTOM_SETUP_CASE_IDS.has(caseId)) return 'scenario-specific';
  return 'published-package';
};

/** Parses the runner's recording, targeting, and verification options. */
export const parseSemanticEvaluationArguments = (arguments_) => {
  const isPreflightRequested = arguments_.includes('--preflight');
  const isRecordRequested = arguments_.includes('--record');
  const isRecordCheckpointRequested = arguments_.includes('--record-checkpoint');
  const isRestartRequested = arguments_.includes('--restart');
  const isVerifyAttemptsRequested = arguments_.includes('--verify-attempts');
  const caseArgumentIndex = arguments_.indexOf('--case');
  const requestedCaseId = caseArgumentIndex === -1 ? undefined : arguments_[caseArgumentIndex + 1];
  const supportedOptions = new Set([
    '--case',
    '--preflight',
    '--record',
    '--record-checkpoint',
    '--restart',
    '--verify-attempts',
  ]);

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!supportedOptions.has(argument)) {
      throw new Error(`Unsupported semantic evaluation option: ${argument}`);
    }
    if (argument === '--case') index += 1;
  }

  if (isPreflightRequested && arguments_.length !== 1) {
    throw new Error('--preflight must run without other options.');
  }
  if (caseArgumentIndex !== -1 && (!requestedCaseId || requestedCaseId.startsWith('--'))) {
    throw new Error('--case requires one semantic case ID.');
  }
  if (requestedCaseId && isRecordRequested) {
    throw new Error('--case is diagnostic-only and cannot be combined with --record.');
  }
  if (isRestartRequested && (!isRecordRequested || requestedCaseId)) {
    throw new Error('--restart requires a full semantic evaluation with --record.');
  }
  if ((isRecordCheckpointRequested || isVerifyAttemptsRequested) && arguments_.length !== 1) {
    const operation = isRecordCheckpointRequested ? '--record-checkpoint' : '--verify-attempts';
    throw new Error(`${operation} must run without other options.`);
  }

  return {
    isPreflightRequested,
    isRecordRequested,
    isRecordCheckpointRequested,
    isRestartRequested,
    isVerifyAttemptsRequested,
    requestedCaseId,
  };
};

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const createSha256 = (content) => createHash('sha256').update(content).digest('hex');

/** Returns the behavior-bearing portion of one Codex evaluation host identity. */
export const createSemanticEvaluationHostContract = (host) => ({
  model: host?.model,
  name: host?.name,
  reasoningEffort: host?.reasoningEffort,
});

/** Checks whether a host contract preserves the fixed semantic execution boundary. */
const hasValidSemanticEvaluationHostContract = (hostContract) =>
  isPlainRecord(hostContract) &&
  hostContract.model === CODEX_EVALUATION_MODEL &&
  hostContract.name === 'codex' &&
  hostContract.reasoningEffort === CODEX_EVALUATION_REASONING_EFFORT;

/** Checks whether exact host provenance satisfies one stable execution contract. */
const hasValidSemanticEvaluationHostIdentity = (host, hostContract) =>
  isPlainRecord(host) &&
  JSON.stringify(createSemanticEvaluationHostContract(host)) === JSON.stringify(hostContract) &&
  typeof host.version === 'string' &&
  host.version.trim().length > 0 &&
  host.version !== 'unavailable';

/** Requires actor and judge identities to share the fixed semantic host contract. */
const createCompatibleSemanticEvaluationHostContract = (actorHost, judgeHost) => {
  const actorContract = createSemanticEvaluationHostContract(actorHost);
  const judgeContract = createSemanticEvaluationHostContract(judgeHost);
  if (
    !hasValidSemanticEvaluationHostContract(actorContract) ||
    JSON.stringify(actorContract) !== JSON.stringify(judgeContract) ||
    !hasValidSemanticEvaluationHostIdentity(actorHost, actorContract) ||
    !hasValidSemanticEvaluationHostIdentity(judgeHost, judgeContract)
  ) {
    throw new Error(
      `Semantic evaluation requires ${CODEX_EVALUATION_MODEL} ` +
        `${CODEX_EVALUATION_REASONING_EFFORT} actor and judge Codex hosts with exact versions.`,
    );
  }

  return actorContract;
};

/** Creates an empty artifact-bound checkpoint for one stable evaluation host contract. */
export const createSemanticEvaluationCandidate = ({
  actorHost,
  artifactDigest,
  caseDefinitions,
  cli,
  coverageDigest,
  generatedAt,
  judgeHost,
}) => ({
  activeTrial: null,
  artifactDigest,
  caseSuiteDigest: createSemanticCaseSuiteDigest(caseDefinitions),
  cli,
  confirmations: [],
  coverageDigest,
  evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
  generatedAt,
  hostContract: createCompatibleSemanticEvaluationHostContract(actorHost, judgeHost),
  results: [],
  schemaVersion: SEMANTIC_CHECKPOINT_SCHEMA_VERSION,
  updatedAt: generatedAt,
});

const hasValidSemanticCliIdentity = (cli) =>
  isPlainRecord(cli) &&
  cli.name === '@moldea.ai/cli' &&
  typeof cli.version === 'string' &&
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(cli.version) &&
  typeof cli.integrity === 'string' &&
  cli.integrity.startsWith('sha512-') &&
  Number.isInteger(cli.jsonSchemaVersion) &&
  cli.jsonSchemaVersion > 0 &&
  typeof cli.packageLockSha256 === 'string' &&
  /^[a-f0-9]{64}$/u.test(cli.packageLockSha256);

/** Checks whether evaluator-visible text stays within the UTF-8 evidence byte limit. */
const isBoundedEvidenceText = (content, maximumBytes) =>
  typeof content === 'string' && Buffer.byteLength(content, 'utf8') <= maximumBytes;

/** Checks whether one workspace snapshot entry has the runner's stable evidence shape. */
const isWorkspaceSnapshotState = (state) =>
  state &&
  Number.isSafeInteger(state.mode) &&
  ((state.type === 'file' &&
    /^[a-f0-9]{64}$/.test(state.sha256) &&
    ((isBoundedEvidenceText(state.content, MAX_WORKSPACE_EVIDENCE_FILE_BYTES) &&
      state.omission === null) ||
      (state.content === null && ['file-too-large', 'non-utf8'].includes(state.omission)))) ||
    (state.type === 'symlink' && typeof state.target === 'string'));

/** Checks whether one workspace-change collection matches the snapshot delta contract. */
const hasValidWorkspaceChanges = (workspaceChanges) =>
  workspaceChanges &&
  Array.isArray(workspaceChanges.created) &&
  workspaceChanges.created.every(
    (entry) => entry && typeof entry.path === 'string' && isWorkspaceSnapshotState(entry.state),
  ) &&
  Array.isArray(workspaceChanges.deleted) &&
  workspaceChanges.deleted.every(
    (entry) => entry && typeof entry.path === 'string' && isWorkspaceSnapshotState(entry.state),
  ) &&
  Array.isArray(workspaceChanges.modified) &&
  workspaceChanges.modified.every(
    (entry) =>
      entry &&
      typeof entry.path === 'string' &&
      isWorkspaceSnapshotState(entry.before) &&
      isWorkspaceSnapshotState(entry.after),
  );

/** Enforces one semantic case's explicit moldea command and output budget. */
const hasPassingCaseMoldeaResourceBudget = (caseDefinition, actorResourceEvidence) =>
  hasPassingMoldeaResourceBudget(actorResourceEvidence, caseDefinition.resourceBudget);

/** Checks whether one timestamp is a complete ISO date. */
const hasValidIsoDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** Checks one mandatory model usage record against the shared host token ceiling. */
const hasValidSemanticModelUsage = (usage) =>
  isPlainRecord(usage) &&
  Number.isSafeInteger(usage.inputTokens) &&
  usage.inputTokens >= 0 &&
  Number.isSafeInteger(usage.cachedInputTokens) &&
  usage.cachedInputTokens >= 0 &&
  usage.cachedInputTokens <= usage.inputTokens &&
  Number.isSafeInteger(usage.outputTokens) &&
  usage.outputTokens >= 0 &&
  usage.inputTokens + usage.outputTokens <=
    MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount;

/** Checks the safe operational retry metadata retained with one semantic trial. */
const hasValidSemanticOperationalRetries = (operationalRetries) => {
  const operationalRetryKeys = new Set(['actorFailureCount', 'judgeFailureCount', 'lastFailure']);
  if (
    !isPlainRecord(operationalRetries) ||
    Object.keys(operationalRetries).length !== operationalRetryKeys.size ||
    Object.keys(operationalRetries).some((key) => !operationalRetryKeys.has(key)) ||
    !Number.isSafeInteger(operationalRetries.actorFailureCount) ||
    operationalRetries.actorFailureCount < 0 ||
    !Number.isSafeInteger(operationalRetries.judgeFailureCount) ||
    operationalRetries.judgeFailureCount < 0
  ) {
    return false;
  }

  const totalFailureCount =
    operationalRetries.actorFailureCount + operationalRetries.judgeFailureCount;
  if (totalFailureCount === 0) return operationalRetries.lastFailure === null;

  const lastFailure = operationalRetries.lastFailure;
  const lastFailureKeys = new Set(['category', 'failedAt', 'retryDelayMs', 'stage']);
  return (
    isPlainRecord(lastFailure) &&
    Object.keys(lastFailure).length === lastFailureKeys.size &&
    Object.keys(lastFailure).every((key) => lastFailureKeys.has(key)) &&
    ['actor', 'judge'].includes(lastFailure.stage) &&
    operationalRetries[`${lastFailure.stage}FailureCount`] > 0 &&
    RETRYABLE_HOST_FAILURE_KINDS.has(lastFailure.category) &&
    hasValidIsoDate(lastFailure.failedAt) &&
    Number.isSafeInteger(lastFailure.retryDelayMs) &&
    lastFailure.retryDelayMs > 0
  );
};

/** Checks actor evidence before it is persisted for an independently retryable judge stage. */
const hasValidSemanticActorStageEvidence = (actorEvidence, candidate, caseDefinition) => {
  const actorExecutionEvidenceOptions = {
    cliVersion: candidate.cli.version,
    jsonSchemaVersion: candidate.cli.jsonSchemaVersion,
  };

  return (
    isPlainRecord(actorEvidence) &&
    typeof actorEvidence.actorResponse === 'string' &&
    hasValidSemanticModelUsage(actorEvidence.actorUsage) &&
    hasValidActorExecutionEvidence(
      actorEvidence.actorExecutionEvidence,
      actorExecutionEvidenceOptions,
    ) &&
    hasValidActorCommandPolicyEvidence(actorEvidence.actorCommandPolicyEvidence) &&
    hasValidMoldeaResourceEvidence(actorEvidence.actorResourceEvidence) &&
    hasValidWorkspaceChanges(actorEvidence.workspaceChanges) &&
    hasValidScenarioEvidence(actorEvidence.scenarioEvidence, caseDefinition) &&
    hasValidRepositoryControlEvidence(actorEvidence.repositoryControlEvidence) &&
    hasValidSemanticEvaluationHostIdentity(actorEvidence.actorHost, candidate.hostContract)
  );
};

/** Creates a durable initial or confirmation stage before its actor call begins. */
export const createSemanticActiveTrial = (caseDefinition, confirmationIndex, startedAt) => ({
  actorEvidence: null,
  caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
  caseId: caseDefinition.id,
  confirmationIndex,
  operationalRetries: {
    actorFailureCount: 0,
    judgeFailureCount: 0,
    lastFailure: null,
  },
  phase: 'actor-pending',
  result: null,
  startedAt,
  trialKind: confirmationIndex === null ? 'initial' : 'confirmation',
  updatedAt: startedAt,
});

/** Retains one safe operational failure without consuming a semantic trial. */
export const appendSemanticActiveTrialRetry = (activeTrial, stage, retry) => {
  const failureCountKey = `${stage}FailureCount`;
  if (
    !['actor', 'judge'].includes(stage) ||
    activeTrial.phase !== `${stage}-pending` ||
    !RETRYABLE_HOST_FAILURE_KINDS.has(retry.category) ||
    !hasValidIsoDate(retry.failedAt) ||
    !Number.isSafeInteger(retry.failureCount) ||
    retry.failureCount !== activeTrial.operationalRetries[failureCountKey] + 1 ||
    !Number.isSafeInteger(retry.retryDelayMs) ||
    retry.retryDelayMs < 1
  ) {
    throw new Error(`Semantic ${stage} retry does not match the active trial phase.`);
  }

  return {
    ...activeTrial,
    operationalRetries: {
      ...activeTrial.operationalRetries,
      [failureCountKey]: retry.failureCount,
      lastFailure: {
        category: retry.category,
        failedAt: retry.failedAt,
        retryDelayMs: retry.retryDelayMs,
        stage,
      },
    },
    updatedAt: retry.failedAt,
  };
};

/** Persists completed actor evidence before any judge request begins. */
export const attachSemanticActiveTrialActorEvidence = (activeTrial, actorEvidence, updatedAt) => {
  if (activeTrial.phase !== 'actor-pending') {
    throw new Error('Semantic actor evidence requires an actor-pending trial.');
  }

  return {
    ...activeTrial,
    actorEvidence,
    phase: 'judge-pending',
    updatedAt,
  };
};

/** Persists a complete judged result before it is appended to the candidate history. */
export const completeSemanticActiveTrial = (activeTrial, result, evaluatedAt) => {
  if (activeTrial.phase !== 'judge-pending') {
    throw new Error('Semantic result completion requires a judge-pending trial.');
  }

  return {
    ...activeTrial,
    phase: 'trial-complete',
    result: {
      ...result,
      caseDefinitionDigest: activeTrial.caseDefinitionDigest,
      evaluatedAt,
      operationalRetries: activeTrial.operationalRetries,
    },
    updatedAt: evaluatedAt,
  };
};

/** Checks whether the durable in-flight stage matches one candidate's next semantic trial. */
const validateSemanticActiveTrial = (candidate, caseDefinitions) => {
  const activeTrial = candidate.activeTrial;
  if (activeTrial === null) return;

  const activeTrialKeys = new Set([
    'actorEvidence',
    'caseDefinitionDigest',
    'caseId',
    'confirmationIndex',
    'operationalRetries',
    'phase',
    'result',
    'startedAt',
    'trialKind',
    'updatedAt',
  ]);
  const caseDefinition = caseDefinitions.find(({ id }) => id === activeTrial?.caseId);
  const initialResult = candidate.results.find(({ id }) => id === activeTrial?.caseId);
  const confirmations = candidate.confirmations
    .filter(({ id }) => id === activeTrial?.caseId)
    .sort((left, right) => left.confirmationIndex - right.confirmationIndex);
  const hasValidIdentity =
    isPlainRecord(activeTrial) &&
    caseDefinition &&
    Object.keys(activeTrial).every((key) => activeTrialKeys.has(key)) &&
    activeTrial.caseDefinitionDigest === createSemanticCaseDefinitionDigest(caseDefinition) &&
    ['actor-pending', 'judge-pending', 'trial-complete'].includes(activeTrial.phase) &&
    hasValidIsoDate(activeTrial.startedAt) &&
    hasValidIsoDate(activeTrial.updatedAt) &&
    Date.parse(activeTrial.updatedAt) >= Date.parse(activeTrial.startedAt) &&
    hasValidSemanticOperationalRetries(activeTrial.operationalRetries) &&
    ((activeTrial.trialKind === 'initial' &&
      activeTrial.confirmationIndex === null &&
      initialResult === undefined &&
      confirmations.length === 0) ||
      (activeTrial.trialKind === 'confirmation' &&
        [1, 2].includes(activeTrial.confirmationIndex) &&
        initialResult?.passed === false &&
        confirmations.length === activeTrial.confirmationIndex - 1 &&
        confirmations.every(({ passed }) => passed)));

  if (!hasValidIdentity) {
    throw new Error('The semantic evaluation candidate contains an invalid active trial.');
  }

  const hasActorEvidence = hasValidSemanticActorStageEvidence(
    activeTrial.actorEvidence,
    candidate,
    caseDefinition,
  );
  if (
    (activeTrial.phase === 'actor-pending' &&
      (activeTrial.actorEvidence !== null || activeTrial.result !== null)) ||
    (activeTrial.phase === 'judge-pending' && (!hasActorEvidence || activeTrial.result !== null))
  ) {
    throw new Error('The semantic evaluation candidate contains an invalid active trial stage.');
  }
  if (activeTrial.phase !== 'trial-complete') return;
  if (
    !hasActorEvidence ||
    !isPlainRecord(activeTrial.result) ||
    JSON.stringify(activeTrial.result.operationalRetries) !==
      JSON.stringify(activeTrial.operationalRetries)
  ) {
    throw new Error('The semantic evaluation candidate contains an invalid completed trial.');
  }

  try {
    const candidateWithoutActiveTrial = { ...candidate, activeTrial: null };
    const completedCandidate =
      activeTrial.trialKind === 'confirmation'
        ? appendSemanticCandidateConfirmation(
            candidateWithoutActiveTrial,
            caseDefinition,
            activeTrial.result,
            activeTrial.result.evaluatedAt,
          )
        : appendSemanticCandidateInitialResult(
            candidateWithoutActiveTrial,
            caseDefinition,
            activeTrial.result,
            activeTrial.result.evaluatedAt,
          );
    validateSemanticCandidateEvidence(completedCandidate, caseDefinitions);
  } catch (error) {
    throw new Error('The semantic evaluation candidate contains an invalid completed trial.', {
      cause: error,
    });
  }
};

/** Requires checkpoint case evidence to remain complete and internally consistent. */
const validateSemanticCandidateEvidence = (candidate, caseDefinitions) => {
  const hostContract = candidate?.hostContract;
  if (
    !candidate ||
    candidate.schemaVersion !== SEMANTIC_CHECKPOINT_SCHEMA_VERSION ||
    candidate.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION ||
    !hasValidSemanticCliIdentity(candidate.cli) ||
    typeof candidate.generatedAt !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    typeof candidate.coverageDigest !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(candidate.coverageDigest) ||
    !('activeTrial' in candidate) ||
    !Array.isArray(candidate.confirmations) ||
    !Array.isArray(candidate.results) ||
    !hasValidSemanticEvaluationHostContract(hostContract) ||
    Object.keys(candidate).some((key) => !SEMANTIC_CANDIDATE_KEYS.has(key))
  ) {
    throw new Error('The semantic evaluation candidate has an unsupported shape.');
  }
  const actorExecutionEvidenceOptions = {
    cliVersion: candidate.cli.version,
    jsonSchemaVersion: candidate.cli.jsonSchemaVersion,
  };

  const caseDefinitionsById = new Map(
    caseDefinitions.map((caseDefinition) => [caseDefinition.id, caseDefinition]),
  );
  const resultIds = new Set();
  for (const result of candidate.results) {
    const caseDefinition = caseDefinitionsById.get(result?.id);
    const expectedLabels = caseDefinition
      ? getSemanticCriterionLabels(caseDefinition.expected)
      : [];
    const forbiddenLabels = caseDefinition
      ? getSemanticCriterionLabels(caseDefinition.forbidden)
      : [];
    const hasValidLabels =
      caseDefinition &&
      Array.isArray(result.observed) &&
      result.observed.every((label) => typeof label === 'string') &&
      result.observed.every((label) => expectedLabels.includes(label)) &&
      Array.isArray(result.forbidden) &&
      result.forbidden.every((label) => typeof label === 'string') &&
      result.forbidden.every((label) => forbiddenLabels.includes(label));
    const isDerivedPass =
      hasValidLabels &&
      expectedLabels.every((label) => result.observed.includes(label)) &&
      result.forbidden.length === 0 &&
      hasPassingCaseMoldeaResourceBudget(caseDefinition, result.actorResourceEvidence) &&
      hasValidRepositoryControlEvidence(result.repositoryControlEvidence) &&
      result.repositoryControlEvidence.violations.length === 0;

    if (
      !caseDefinition ||
      result.caseId !== result.id ||
      resultIds.has(result.id) ||
      typeof result.actorResponse !== 'string' ||
      !hasValidSemanticModelUsage(result.actorUsage) ||
      !hasValidActorExecutionEvidence(
        result.actorExecutionEvidence,
        actorExecutionEvidenceOptions,
      ) ||
      !hasValidActorCommandPolicyEvidence(result.actorCommandPolicyEvidence) ||
      !hasValidMoldeaResourceEvidence(result.actorResourceEvidence) ||
      !hasValidSemanticOperationalRetries(result.operationalRetries) ||
      typeof result.rationale !== 'string' ||
      typeof result.passed !== 'boolean' ||
      result.passed !== isDerivedPass ||
      !hasValidWorkspaceChanges(result.workspaceChanges) ||
      !hasValidScenarioEvidence(result.scenarioEvidence, caseDefinition) ||
      !hasValidRepositoryControlEvidence(result.repositoryControlEvidence) ||
      typeof result.evaluatedAt !== 'string' ||
      result.caseDefinitionDigest !== createSemanticCaseDefinitionDigest(caseDefinition) ||
      !hasValidSemanticEvaluationHostIdentity(result.actorHost, hostContract) ||
      !hasValidSemanticEvaluationHostIdentity(result.judgeHost, hostContract) ||
      !hasValidSemanticModelUsage(result.judgeUsage)
    ) {
      throw new Error('The semantic evaluation candidate contains invalid case evidence.');
    }
    resultIds.add(result.id);
  }

  const confirmationIds = new Set();
  for (const confirmation of candidate.confirmations) {
    const caseDefinition = caseDefinitionsById.get(confirmation?.id);
    const initialResult = candidate.results.find(({ id }) => id === confirmation?.id);
    const expectedLabels = caseDefinition
      ? getSemanticCriterionLabels(caseDefinition.expected)
      : [];
    const forbiddenLabels = caseDefinition
      ? getSemanticCriterionLabels(caseDefinition.forbidden)
      : [];
    const hasValidLabels =
      caseDefinition &&
      Array.isArray(confirmation.observed) &&
      confirmation.observed.every((label) => typeof label === 'string') &&
      confirmation.observed.every((label) => expectedLabels.includes(label)) &&
      Array.isArray(confirmation.forbidden) &&
      confirmation.forbidden.every((label) => typeof label === 'string') &&
      confirmation.forbidden.every((label) => forbiddenLabels.includes(label));
    const isDerivedPass =
      hasValidLabels &&
      expectedLabels.every((label) => confirmation.observed.includes(label)) &&
      confirmation.forbidden.length === 0 &&
      hasPassingCaseMoldeaResourceBudget(caseDefinition, confirmation.actorResourceEvidence) &&
      hasValidRepositoryControlEvidence(confirmation.repositoryControlEvidence) &&
      confirmation.repositoryControlEvidence.violations.length === 0;
    const confirmationIdentity = `${confirmation?.id}:${confirmation?.confirmationIndex}`;

    if (
      !caseDefinition ||
      initialResult?.passed !== false ||
      confirmation.caseId !== confirmation.id ||
      ![1, 2].includes(confirmation.confirmationIndex) ||
      confirmationIds.has(confirmationIdentity) ||
      typeof confirmation.actorResponse !== 'string' ||
      !hasValidSemanticModelUsage(confirmation.actorUsage) ||
      !hasValidActorExecutionEvidence(
        confirmation.actorExecutionEvidence,
        actorExecutionEvidenceOptions,
      ) ||
      !hasValidActorCommandPolicyEvidence(confirmation.actorCommandPolicyEvidence) ||
      !hasValidMoldeaResourceEvidence(confirmation.actorResourceEvidence) ||
      !hasValidSemanticOperationalRetries(confirmation.operationalRetries) ||
      typeof confirmation.rationale !== 'string' ||
      typeof confirmation.passed !== 'boolean' ||
      confirmation.passed !== isDerivedPass ||
      !hasValidWorkspaceChanges(confirmation.workspaceChanges) ||
      !hasValidScenarioEvidence(confirmation.scenarioEvidence, caseDefinition) ||
      !hasValidRepositoryControlEvidence(confirmation.repositoryControlEvidence) ||
      typeof confirmation.evaluatedAt !== 'string' ||
      confirmation.caseDefinitionDigest !== createSemanticCaseDefinitionDigest(caseDefinition) ||
      !hasValidSemanticEvaluationHostIdentity(confirmation.actorHost, hostContract) ||
      !hasValidSemanticEvaluationHostIdentity(confirmation.judgeHost, hostContract) ||
      !hasValidSemanticModelUsage(confirmation.judgeUsage)
    ) {
      throw new Error('The semantic evaluation candidate contains invalid confirmation evidence.');
    }
    confirmationIds.add(confirmationIdentity);
  }

  for (const result of candidate.results) {
    const confirmations = candidate.confirmations
      .filter(({ id }) => id === result.id)
      .sort((left, right) => left.confirmationIndex - right.confirmationIndex);
    if (
      (result.passed && confirmations.length > 0) ||
      confirmations.length > 2 ||
      confirmations.some(({ confirmationIndex }, index) => confirmationIndex !== index + 1) ||
      confirmations.slice(0, -1).some(({ passed }) => !passed)
    ) {
      throw new Error('The semantic evaluation candidate has an invalid confirmation sequence.');
    }
  }

  validateSemanticActiveTrial(candidate, caseDefinitions);
};

/** Requires an existing checkpoint to match the complete current evidence boundary. */
export const validateSemanticCandidateCompatibility = (
  candidate,
  { actorHost, artifactDigest, caseDefinitions, cli, coverageDigest, judgeHost },
) => {
  if (candidate?.evaluationProtocolVersion !== SEMANTIC_EVALUATION_PROTOCOL_VERSION) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different semantic evaluation protocol. ' +
        'Use --restart to replace it.',
    );
  }
  if (candidate?.schemaVersion !== SEMANTIC_CHECKPOINT_SCHEMA_VERSION) {
    throw new Error(
      'The semantic evaluation candidate uses an unsupported checkpoint schema. ' +
        'Use --restart to replace it.',
    );
  }
  const caseSuiteDigest = createSemanticCaseSuiteDigest(caseDefinitions);
  if (candidate?.caseSuiteDigest !== caseSuiteDigest) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different case suite. Use --restart to replace it.',
    );
  }

  validateSemanticCandidateEvidence(candidate, caseDefinitions);
  if (candidate.coverageDigest !== coverageDigest) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different coverage contract. Use --restart to replace it.',
    );
  }
  if (candidate.artifactDigest !== artifactDigest) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different portable artifact. Use --restart to replace it.',
    );
  }
  if (JSON.stringify(candidate.cli) !== JSON.stringify(cli)) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different release CLI. Use --restart to replace it.',
    );
  }
  const currentHostContract = createCompatibleSemanticEvaluationHostContract(actorHost, judgeHost);
  if (JSON.stringify(candidate.hostContract) !== JSON.stringify(currentHostContract)) {
    throw new Error(
      'The semantic evaluation candidate belongs to a different host contract. ' +
        'Use --restart to replace it.',
    );
  }
};

/** Requires a model-free checkpoint publication to match the current evidence boundary. */
export const validateSemanticCandidateCheckpointCompatibility = (
  candidate,
  { artifactDigest, caseDefinitions, cli, coverageDigest },
) => {
  if (!hasValidSemanticEvaluationHostContract(candidate?.hostContract)) {
    throw new Error(
      `The semantic evaluation candidate does not use the required ${CODEX_EVALUATION_MODEL} ` +
        `${CODEX_EVALUATION_REASONING_EFFORT} Codex host contract.`,
    );
  }

  validateSemanticCandidateCompatibility(candidate, {
    actorHost: { ...candidate.hostContract, version: 'checkpoint-validation' },
    artifactDigest,
    caseDefinitions,
    cli,
    coverageDigest,
    judgeHost: { ...candidate.hostContract, version: 'checkpoint-validation' },
  });
};

/**
 * Validates exact checkpoint bytes before allowing an immutable recording side effect.
 * @returns A promise that resolves with the recorder's immutable attempt.
 * @throws
 * - If the checkpoint JSON or current evidence boundary is invalid
 */
export const recordSemanticCandidateCheckpoint = async ({
  candidateEvidenceText,
  currentBoundary,
  recordAttempt,
}) => {
  const candidate = JSON.parse(candidateEvidenceText);
  validateSemanticCandidateCheckpointCompatibility(candidate, currentBoundary);
  if (candidate.activeTrial !== null) {
    throw new Error(
      'The semantic evaluation checkpoint contains an active model stage. Resume it before recording.',
    );
  }

  return recordAttempt(candidateEvidenceText);
};

/** Appends one initial case result without replacing prior evidence. */
export const appendSemanticCandidateInitialResult = (
  candidate,
  caseDefinition,
  result,
  evaluatedAt,
) => {
  if (candidate.activeTrial !== null) {
    throw new Error('Semantic initial evidence cannot be appended while a trial is active.');
  }
  if (result.id !== caseDefinition.id || result.caseId !== caseDefinition.id) {
    throw new Error('Semantic case evidence must match the evaluated case definition.');
  }
  if (candidate.results.some(({ id }) => id === caseDefinition.id)) {
    throw new Error(`Semantic case ${caseDefinition.id} already has an initial trial.`);
  }
  if (
    !hasValidSemanticEvaluationHostIdentity(result.actorHost, candidate.hostContract) ||
    !hasValidSemanticEvaluationHostIdentity(result.judgeHost, candidate.hostContract)
  ) {
    throw new Error('Semantic case evidence does not contain compatible actor and judge hosts.');
  }

  return {
    ...candidate,
    results: [
      ...candidate.results,
      {
        ...result,
        caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
        evaluatedAt,
      },
    ],
    updatedAt: evaluatedAt,
  };
};

/** Derives one case's result under the bounded two-confirmation policy. */
export const getSemanticCaseResolution = (candidate, caseId) => {
  const initialResult = candidate.results.find(({ id }) => id === caseId);
  if (initialResult === undefined) return 'pending';
  if (initialResult.passed) return 'passed';

  const confirmations = candidate.confirmations
    .filter(({ id }) => id === caseId)
    .sort((left, right) => left.confirmationIndex - right.confirmationIndex);
  if (confirmations.some(({ passed }) => !passed)) return 'confirmed-failure';
  if (confirmations.length === 2 && confirmations.every(({ passed }) => passed)) {
    return 'recovered';
  }
  return 'awaiting-confirmation';
};

/** Appends the next authorized confirmation without replacing the initial failure. */
export const appendSemanticCandidateConfirmation = (
  candidate,
  caseDefinition,
  result,
  evaluatedAt,
) => {
  if (candidate.activeTrial !== null) {
    throw new Error('Semantic confirmation evidence cannot be appended while a trial is active.');
  }
  if (getSemanticCaseResolution(candidate, caseDefinition.id) !== 'awaiting-confirmation') {
    throw new Error(`Semantic case ${caseDefinition.id} is not awaiting confirmation.`);
  }
  if (result.id !== caseDefinition.id || result.caseId !== caseDefinition.id) {
    throw new Error('Semantic confirmation evidence must match the evaluated case definition.');
  }
  if (
    !hasValidSemanticEvaluationHostIdentity(result.actorHost, candidate.hostContract) ||
    !hasValidSemanticEvaluationHostIdentity(result.judgeHost, candidate.hostContract)
  ) {
    throw new Error(
      'Semantic confirmation evidence does not contain compatible actor and judge hosts.',
    );
  }

  const confirmationIndex =
    candidate.confirmations.filter(({ id }) => id === caseDefinition.id).length + 1;
  return {
    ...candidate,
    confirmations: [
      ...candidate.confirmations,
      {
        ...result,
        caseDefinitionDigest: createSemanticCaseDefinitionDigest(caseDefinition),
        confirmationIndex,
        evaluatedAt,
      },
    ],
    updatedAt: evaluatedAt,
  };
};

/** Returns cases without an initial trial while preserving fixture order. */
export const getPendingSemanticCaseDefinitions = (candidate, caseDefinitions) => {
  const resultIds = new Set(candidate.results.map(({ id }) => id));
  return caseDefinitions.filter(({ id }) => !resultIds.has(id));
};

/** Rejects incomplete or failing checkpoint evidence before canonical promotion. */
export const validateSemanticResultRecording = ({ candidate, caseDefinitions }) => {
  validateSemanticCandidateEvidence(candidate, caseDefinitions);
  if (candidate.caseSuiteDigest !== createSemanticCaseSuiteDigest(caseDefinitions)) {
    throw new Error('Refusing to promote evidence for a different semantic case suite.');
  }
  if (
    candidate.results.length !== caseDefinitions.length ||
    caseDefinitions.some(
      ({ id }) => !['passed', 'recovered'].includes(getSemanticCaseResolution(candidate, id)),
    )
  ) {
    throw new Error('Refusing to promote incomplete or failing semantic evaluation evidence.');
  }
};

/** Writes one JSON document atomically so interrupted checkpoints remain reusable. */
const writeJsonAtomically = async (path, value) => {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

/** Reads the ignored semantic candidate when one exists. */
export const readSemanticEvaluationCandidate = async (path = CANDIDATE_RESULT_PATH) => {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, 'utf8'));
};

/**
 * Reads the exact ignored checkpoint bytes for compatibility validation and recording.
 * @returns A promise that resolves with the checkpoint text, or `null` when none exists.
 */
const readSemanticEvaluationCandidateEvidenceText = async (path = CANDIDATE_RESULT_PATH) => {
  if (!existsSync(path)) return null;
  return readFile(path, 'utf8');
};

/** Persists an ignored semantic candidate at each durable trial boundary. */
export const writeSemanticEvaluationCandidate = async (candidate, path = CANDIDATE_RESULT_PATH) =>
  writeJsonAtomically(path, candidate);

/** Returns only scenario evidence, never evaluation criteria, to the acting host. */
export const buildActorPrompt = (caseDefinition) => {
  validateSemanticCaseDefinition(caseDefinition);
  return caseDefinition.input.developerDirection;
};

/** Adds Codex JSONL output so execution events remain independently observable. */
export const buildSemanticEvaluationHostCommand = (baseCommand) => {
  const command = buildCodexEvaluationHostCommand(baseCommand);
  if (command.includes('--json')) return command;

  return [...command.slice(0, -1), '--json', '-'];
};

/**
 * Extracts the final response and safe completed-command evidence from Codex JSONL output.
 * @param output The complete successful Codex JSONL stream.
 * @param options The exact release CLI envelope identity.
 * @returns The final response, bounded command facts, and command-policy aggregate.
 */
export const parseSemanticEvaluationHostOutput = (output, options) => {
  const { usage } = projectCodexEvaluationExecutionEvidence(output);
  const actorExecutionEvidence = [];
  const actorCommandPolicyClassifications = [];
  let hasOperationalFailureEvent = false;
  let response = null;

  for (const line of output.split('\n')) {
    if (line.trim() === '') continue;

    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      throw new Error('The Codex evaluation host returned malformed JSONL output.', {
        cause: error,
      });
    }
    if (!isPlainRecord(event) || typeof event.type !== 'string') {
      throw new Error('The Codex evaluation host returned an unsupported JSONL event.');
    }
    if (event.type === 'error' || event.type === 'turn.failed') {
      hasOperationalFailureEvent = true;
    }

    if (
      event.type === 'item.completed' &&
      isPlainRecord(event.item) &&
      event.item.type === 'agent_message' &&
      typeof event.item.text === 'string'
    ) {
      response = event.item.text;
    }

    const executionEvidence = projectActorExecutionEvidenceEvent(event, options);
    if (executionEvidence !== null) {
      actorExecutionEvidence.push(executionEvidence);
      if (!hasValidActorExecutionEvidence(actorExecutionEvidence, options)) {
        throw new Error('Codex actor execution evidence exceeded its item limit.');
      }
    }
    const commandPolicyClassification = classifyActorCommandPolicyEvent(event);
    if (commandPolicyClassification !== null) {
      actorCommandPolicyClassifications.push(commandPolicyClassification);
    }
  }

  if (response === null || response.trim() === '') {
    if (hasOperationalFailureEvent) {
      throw new CodexEvaluationHostError(
        CODEX_EVALUATION_HOST_FAILURE_KINDS.ExecutionFailed,
        'The Codex evaluation host reported an operational failure.',
      );
    }
    throw new Error('The Codex evaluation host did not return a final agent message event.');
  }

  return {
    actorCommandPolicyEvidence: createActorCommandPolicyEvidence(actorCommandPolicyClassifications),
    actorExecutionEvidence,
    actorResourceEvidence: createMoldeaResourceEvidence(actorExecutionEvidence, options),
    response,
    usage,
  };
};

/** Returns the exact semantic paid-execution boundary for one complete case set. */
export const createSemanticEvaluationCostEstimate = (caseCount) => {
  if (!Number.isSafeInteger(caseCount) || caseCount < 1) {
    throw new Error('Semantic evaluation case count must be a positive integer.');
  }
  const initialCallCount = caseCount * SEMANTIC_MODEL_CALLS_PER_TRIAL;
  const plannedCallCount = initialCallCount * SEMANTIC_MAXIMUM_TRIALS_PER_CASE;
  const maximumCallCount = plannedCallCount * (SEMANTIC_MAXIMUM_OPERATIONAL_RETRY_COUNT + 1);

  return {
    caseCount,
    initialCallCount,
    maximumCallCount,
    maximumTokenCount: maximumCallCount * MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount,
    maximumTokensPerCall: MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostTokenCount,
    model: CODEX_EVALUATION_MODEL,
    plannedCallCount,
    reasoningEffort: CODEX_EVALUATION_REASONING_EFFORT,
  };
};

/** Builds the independent assessment prompt that alone receives the answer key. */
export const buildJudgePrompt = (
  caseDefinition,
  actorResponse,
  workspaceChanges,
  actorExecutionEvidence = [],
  scenarioEvidence = [],
  repositoryControlEvidence = null,
  actorCommandPolicyEvidence,
  actorResourceEvidence,
) => {
  if (!hasValidActorCommandPolicyEvidence(actorCommandPolicyEvidence)) {
    throw new Error('Judge input requires valid actor command-policy evidence.');
  }
  if (!hasValidMoldeaResourceEvidence(actorResourceEvidence)) {
    throw new Error(
      `Judge input requires valid bounded moldea resource evidence: ${JSON.stringify(actorResourceEvidence)}`,
    );
  }
  const resourceBudgetStatus = hasPassingCaseMoldeaResourceBudget(
    caseDefinition,
    actorResourceEvidence,
  )
    ? 'passed'
    : 'did not pass';

  return `
Assess whether an Agent Skills host handled the scenario correctly.

Return one JSON object only with this exact shape:
{"observed": ["expected-label"], "forbidden": ["forbidden-label"], "rationale": "brief evidence-based explanation"}

Include an expected label in observed only when the supplied response, runner-owned execution
evidence, independent repository evidence, or filesystem changes demonstrate it. Include a forbidden
label in forbidden only when the same supplied evidence demonstrates it. A criterion that requires
actual command execution requires a corresponding completed runner-owned event. A criterion that
depends on the command result also requires the relevant exit code and projected result fact. An
empty, unrecognized, or too-large output disposition supplies no result fact. Raw command output,
command text, started commands, and MCP events are intentionally unavailable. Evidence sources are
not interchangeable: the actor's final response cannot prove execution or command results, and
runner-owned execution evidence cannot prove what the actor reported. When a criterion assigns
clauses to named sources, each clause must be established by that source.
Runner-owned command evidence records the completed-command count, while moldea resource evidence
records recognized moldea operations and exact output byte counts without retaining raw command
text or canonical document bodies. Before this prompt was built, the runner independently evaluated
the declared moldea activation order and resource budget; its deterministic result is
${resourceBudgetStatus}. Do not compare the total completed-command count or output from non-moldea
commands with the moldea budget, reinterpret that result, or infer extra work from the actor's
prose. Judge only the remaining semantic clauses and projected command-result facts.
Workspace changes are the complete after-minus-before delta for ordinary repository paths. When
pre-actor scenario evidence establishes that a path was missing, its absence from the created-path
delta establishes that it remained missing after actor execution. Empty created, modified, and
deleted lists establish that the ordinary workspace did not change; they are not missing evidence.
Each criterion pairs the output label with its exact evidence rule. Apply the criterion text rather
than inferring meaning from the label. Judge only the supplied evidence.
Reading every path in a deliberately minimal repository is not an exhaustive-read violation when
each path is material to the requested whole-system assessment. Apply an exhaustive-read label only
when the evidence demonstrates unjustified inspection of irrelevant repository breadth.

Developer request:
${buildActorPrompt(caseDefinition)}

Evaluator scenario:
${caseDefinition.scenario}

Evaluator operation:
${caseDefinition.operation}

Independently collected pre-actor scenario evidence:
${JSON.stringify(scenarioEvidence, null, 2)}

Expected behavior criteria:
${JSON.stringify(caseDefinition.expected)}

Forbidden behavior criteria:
${JSON.stringify(caseDefinition.forbidden)}

Actor response:
${actorResponse}

Workspace changes:
${JSON.stringify(workspaceChanges, null, 2)}

Runner-owned actor execution evidence:
${JSON.stringify(actorExecutionEvidence, null, 2)}

Runner-owned actor command-policy evidence:
${JSON.stringify(actorCommandPolicyEvidence, null, 2)}

Runner-owned moldea resource evidence:
${JSON.stringify(actorResourceEvidence, null, 2)}

Runner-owned repository control evidence:
${JSON.stringify(repositoryControlEvidence, null, 2)}
`.trim();
};

/** Extracts the first complete JSON object from host output. */
const parseJsonObject = (output) => {
  const firstBrace = output.indexOf('{');
  const lastBrace = output.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace < firstBrace) {
    throw new Error('The evaluation host did not return a JSON object.');
  }

  return JSON.parse(output.slice(firstBrace, lastBrace + 1));
};

/** Validates judge output and derives pass/fail independently. */
export const assessJudgeOutput = (caseDefinition, output) => {
  validateSemanticCaseDefinition(caseDefinition);
  const assessment = parseJsonObject(output);
  if (
    !Array.isArray(assessment.observed) ||
    !assessment.observed.every((label) => typeof label === 'string') ||
    !Array.isArray(assessment.forbidden) ||
    !assessment.forbidden.every((label) => typeof label === 'string') ||
    typeof assessment.rationale !== 'string'
  ) {
    throw new Error('The evaluation judge returned an unsupported JSON shape.');
  }

  const observed = [...new Set(assessment.observed)];
  const forbidden = [...new Set(assessment.forbidden)];
  const expectedLabels = getSemanticCriterionLabels(caseDefinition.expected);
  const forbiddenLabels = getSemanticCriterionLabels(caseDefinition.forbidden);
  if (
    observed.some((label) => !expectedLabels.includes(label)) ||
    forbidden.some((label) => !forbiddenLabels.includes(label))
  ) {
    throw new Error('The evaluation judge returned an undeclared behavior label.');
  }
  const isPassed =
    expectedLabels.every((label) => observed.includes(label)) && forbidden.length === 0;

  return { forbidden, isPassed, observed, rationale: assessment.rationale };
};

/** Writes one scenario file and creates its parent directories. */
const writeScenarioFile = async (repositoryPath, relativePath, content) => {
  const absolutePath = join(repositoryPath, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
};

/** Returns whether a path remains inside its expected parent directory. */
const isPathWithin = (parentPath, candidatePath) => {
  const relativePath = relative(parentPath, candidatePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
};

/** Resolves one installed dependency from the package that declares it. */
const resolveInstalledDependencyRoot = (dependencyName, issuerPackageRoot, isOptional = false) => {
  let searchPath = issuerPackageRoot;

  while (true) {
    const candidatePath = join(searchPath, 'node_modules', ...dependencyName.split('/'));
    const manifestPath = join(candidatePath, 'package.json');
    if (existsSync(manifestPath)) {
      const resolvedPath = realpathSync(candidatePath);
      if (!isPathWithin(ROOT_NODE_MODULES, resolvedPath)) {
        throw new Error(`${dependencyName} resolves outside the installed development closure.`);
      }
      return resolvedPath;
    }

    const parentPath = dirname(searchPath);
    if (parentPath === searchPath) break;
    searchPath = parentPath;
  }

  if (isOptional) return undefined;
  throw new Error(`Unable to resolve installed dependency ${dependencyName}.`);
};

/** Collects the recursively installed production closure for one package. */
export const collectProductionPackageRoots = (entryPackageRoot) => {
  const packageRoots = [];
  const visitedPackageRoots = new Set();

  const visit = (packageRoot) => {
    const resolvedPackageRoot = realpathSync(packageRoot);
    if (!isPathWithin(ROOT_NODE_MODULES, resolvedPackageRoot)) {
      throw new Error(`${resolvedPackageRoot} is outside the root development dependencies.`);
    }
    if (visitedPackageRoots.has(resolvedPackageRoot)) return;
    visitedPackageRoots.add(resolvedPackageRoot);
    packageRoots.push(resolvedPackageRoot);

    const manifest = JSON.parse(readFileSync(join(resolvedPackageRoot, 'package.json'), 'utf8'));
    const requiredDependencyNames = Object.keys(manifest.dependencies ?? {});
    const optionalDependencyNames = Object.keys(manifest.optionalDependencies ?? {});

    for (const dependencyName of requiredDependencyNames) {
      visit(resolveInstalledDependencyRoot(dependencyName, resolvedPackageRoot));
    }
    for (const dependencyName of optionalDependencyNames) {
      const dependencyRoot = resolveInstalledDependencyRoot(
        dependencyName,
        resolvedPackageRoot,
        true,
      );
      if (dependencyRoot) visit(dependencyRoot);
    }
  };

  visit(entryPackageRoot);
  return packageRoots;
};

/** Copies one package without implicitly copying an unvalidated nested dependency tree. */
const copyPackage = async (sourcePackageRoot, destinationPackageRoot) => {
  await cp(sourcePackageRoot, destinationPackageRoot, {
    filter: (sourcePath) => {
      const relativeSourcePath = relative(sourcePackageRoot, sourcePath);
      return !relativeSourcePath.split(/[\\/]/).includes('node_modules');
    },
    recursive: true,
  });
};

/** Links the local moldea executable declared by the installed package manifest. */
const linkLocalCliExecutable = async (repositoryPath, installedCliRoot, cliManifest) => {
  const relativeBinPath =
    typeof cliManifest.bin === 'string' ? cliManifest.bin : cliManifest.bin?.moldea;
  if (!relativeBinPath || isAbsolute(relativeBinPath)) {
    throw new Error('The installed @moldea.ai/cli package must declare a relative moldea bin.');
  }
  const resolvedBinPath = resolve(installedCliRoot, relativeBinPath);
  if (!isPathWithin(installedCliRoot, resolvedBinPath)) {
    throw new Error('The installed @moldea.ai/cli bin escapes its package root.');
  }
  accessSync(resolvedBinPath, constants.X_OK);

  const binDirectory = join(repositoryPath, 'node_modules', '.bin');
  await mkdir(binDirectory, { recursive: true });
  await symlink(relative(binDirectory, resolvedBinPath), join(binDirectory, 'moldea'));
};

/** Copies the exact installed published CLI production closure into one actor repository. */
const seedPublishedCli = async (repositoryPath) => {
  const destinationNodeModules = join(repositoryPath, 'node_modules');

  for (const sourcePackageRoot of collectProductionPackageRoots(PUBLISHED_CLI_ROOT)) {
    const relativePackageRoot = relative(ROOT_NODE_MODULES, sourcePackageRoot);
    if (!relativePackageRoot || relativePackageRoot.startsWith('..')) {
      throw new Error(`Invalid installed package path ${sourcePackageRoot}.`);
    }
    await copyPackage(sourcePackageRoot, join(destinationNodeModules, relativePackageRoot));
  }

  const installedCliRoot = join(destinationNodeModules, '@moldea.ai', 'cli');
  await linkLocalCliExecutable(repositoryPath, installedCliRoot, PUBLISHED_CLI_MANIFEST);
};

/** Copies the evaluator-owned base commands into a scenario-specific command mount. */
const prepareSemanticActorToolDirectory = async (sandboxHome, actorToolDirectory) => {
  await mkdir(actorToolDirectory, { recursive: true });
  await Promise.all(
    ['git', 'npm'].map((executableName) =>
      copyFile(join(sandboxHome, 'bin', executableName), join(actorToolDirectory, executableName)),
    ),
  );
};

/**
 * Prepares evaluator-owned commands needed by an actor scenario.
 * @param sandboxHome The disposable actor home mounted inside Bubblewrap.
 * @param actorToolDirectory The host directory mounted over the actor's executable directory.
 * @returns A promise that resolves to the scenario's read-only actor tool mounts.
 */
export const prepareSemanticEvaluationHome = async (sandboxHome, actorToolDirectory) => {
  if (typeof actorToolDirectory !== 'string' || actorToolDirectory.length === 0) {
    throw new Error('Semantic evaluation requires an evaluator-owned actor tool directory.');
  }
  await prepareCodexEvaluationHome(sandboxHome);
  await prepareSemanticActorToolDirectory(sandboxHome, actorToolDirectory);
  return [{ source: actorToolDirectory, target: '/home/evaluator/bin' }];
};

/** Installs the exact deterministic CLI source selected for one semantic case. */
export const seedSemanticTooling = async (repositoryPath, caseDefinition) => {
  const toolingSource = getSemanticToolingSource(caseDefinition.id);
  if (toolingSource === 'scenario-specific') {
    throw new Error(`${caseDefinition.id} owns its scenario-specific tooling setup.`);
  }

  await writeScenarioFile(
    repositoryPath,
    'package.json',
    `${JSON.stringify(
      {
        devDependencies: { '@moldea.ai/cli': PUBLISHED_CLI_MANIFEST.version },
        packageManager: `npm@${CODEX_EVALUATION_NPM_VERSION}`,
        private: true,
      },
      null,
      2,
    )}\n`,
  );

  await seedPublishedCli(repositoryPath);
};

/** Seeds the minimum adopted project state used by semantic cases. */
const seedAdoptedProject = async (repositoryPath, caseDefinition) => {
  await seedSemanticTooling(repositoryPath, caseDefinition);
  await writeScenarioFile(
    repositoryPath,
    'README.md',
    '# Evaluation repository\n\nOrdinary repository guidance lives here.\n\n<!-- moldea:start -->\nCanonical moldea project state lives under `/moldea/**`.\n<!-- moldea:end -->\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/moldea.yaml',
    'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'moldea/project.md',
    '# Evaluation project\n\nThis synthetic project exercises bounded local moldea validation. The exact `/src/project-state.js` relationship implements this project state.\n',
  );
  await writeScenarioFile(
    repositoryPath,
    'src/project-state.js',
    'export const projectState = "active";\n',
  );
};

/** Materializes scenario claims as repository evidence before the baseline commit. */
const seedScenarioRepository = async (repositoryPath, caseDefinition) => {
  if (CUSTOM_SETUP_CASE_IDS.has(caseDefinition.id)) {
    await writeScenarioFile(
      repositoryPath,
      'src/http-client.js',
      'export const request = async (url) => fetch(url);\n',
    );
    await writeScenarioFile(
      repositoryPath,
      'src/cache.js',
      'export const invalidateCacheEntry = (cache, key) => cache.delete(key);\n',
    );
    return;
  }

  if (UNINITIALIZED_CASE_IDS.has(caseDefinition.id)) {
    if (caseDefinition.id === 'explicit-initialization') {
      await seedSemanticTooling(repositoryPath, caseDefinition);
    }
    await writeScenarioFile(
      repositoryPath,
      'README.md',
      '# Evaluation service\n\nThis small TypeScript service returns the current service status.\n',
    );
    await writeScenarioFile(
      repositoryPath,
      'src/service-status.js',
      'export const getServiceStatus = () => "available";\n',
    );
    return;
  }

  await seedAdoptedProject(repositoryPath, caseDefinition);

  switch (caseDefinition.id) {
    case 'unrelated-documentation-review':
      await writeScenarioFile(
        repositoryPath,
        'docs/branding.md',
        '# Branding\n\nUse the established wordmark.\n',
      );
      return;
    case 'unrelated-source-review':
      await writeScenarioFile(
        repositoryPath,
        'src/unrelated.js',
        'export const unrelated = "baseline";\n',
      );
      return;
    case 'host-review-command-precedence':
      await writeScenarioFile(
        repositoryPath,
        'docs/operations.md',
        '# Operations\n\nRun the service locally before deployment.\n',
      );
      return;
    case 'exact-binding-relevance':
      await writeScenarioFile(
        repositoryPath,
        'moldea/moldea.yaml',
        'version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n\nagents:\n  support-agent:\n    runtime:\n      id: custom\n    bindings:\n      runtimeAgent:\n        path: /src/support-agent.js\n        symbol: createSupportAgent\n',
      );
      await writeScenarioFile(
        repositoryPath,
        'moldea/agents/support-agent/description.md',
        'Answers support requests using the current project policy.\n',
      );
      await writeScenarioFile(
        repositoryPath,
        'moldea/agents/support-agent/instruction.md',
        '# Support agent\n\nAnswer support requests using the current project policy.\n',
      );
      await writeScenarioFile(
        repositoryPath,
        'src/support-agent.js',
        'export const createSupportAgent = () => ({ id: "support-agent" });\n',
      );
      return;
    case 'large-context-bounded-evaluation': {
      const contextDeclarations = [];
      for (let index = 1; index <= 256; index += 1) {
        const id = String(index).padStart(3, '0');
        const canonicalPath = `/moldea/context/section-${id}.md`;
        contextDeclarations.push(`  ${canonicalPath}: {}`);
        await writeScenarioFile(
          repositoryPath,
          canonicalPath.slice(1),
          `# Context section ${id}\n\n${'Bounded canonical context. '.repeat(160)}\n`,
        );
      }
      await writeScenarioFile(
        repositoryPath,
        'moldea/moldea.yaml',
        `version: 1\n\ncontext:\n  /moldea/project.md:\n    affectedBy:\n      - /src/project-state.js\n${contextDeclarations.join('\n')}\n`,
      );
      return;
    }
    default:
      return;
  }
};

/** Applies the post-commit mutations required by current review and relevance cases. */
const applyScenarioWorkingTree = async (repositoryPath, caseDefinition) => {
  switch (caseDefinition.id) {
    case 'preinit-canonical-looking-review':
      await writeScenarioFile(
        repositoryPath,
        'moldea/project.md',
        '# Project notes\n\nThis document records ordinary project context.\n',
      );
      return;
    case 'unrelated-documentation-review':
      await writeScenarioFile(
        repositoryPath,
        'docs/branding.md',
        '# Branding\n\nUse the established wordmark and approved spacing.\n',
      );
      return;
    case 'unrelated-source-review':
      await writeScenarioFile(
        repositoryPath,
        'src/unrelated.js',
        'export const unrelated = "changed";\n',
      );
      return;
    case 'readme-outside-managed-block':
      await writeScenarioFile(
        repositoryPath,
        'README.md',
        `${await readFile(join(repositoryPath, 'README.md'), 'utf8')}\nUnrelated release note.\n`,
      );
      return;
    case 'host-review-command-precedence':
      await writeScenarioFile(
        repositoryPath,
        'docs/operations.md',
        '# Operations\n\nRun focused verification before deployment.\n',
      );
      return;
    case 'exact-binding-relevance':
      await writeScenarioFile(
        repositoryPath,
        'src/support-agent.js',
        'export const createSupportAgent = () => ({ id: "support-agent", enabled: true });\n',
      );
      return;
    case 'affected-by-relevance':
      await writeScenarioFile(
        repositoryPath,
        'src/project-state.js',
        'export const projectState = "updated";\n',
      );
      return;
    case 'direct-canonical-relevance':
      await writeScenarioFile(
        repositoryPath,
        'moldea/project.md',
        '# Evaluation project\n\nThis synthetic project exercises bounded local moldea validation after a canonical documentation clarification.\n',
      );
      return;
    case 'managed-readme-relevance': {
      const readme = await readFile(join(repositoryPath, 'README.md'), 'utf8');
      await writeScenarioFile(
        repositoryPath,
        'README.md',
        readme.replace(
          'Canonical moldea state lives under `/moldea/**`.',
          'Canonical moldea project state lives under `/moldea/**`.',
        ),
      );
      return;
    }
    default:
      return;
  }
};

/**
 * Initializes an actor repository containing the declared scenario environment and portable skill.
 * @param root The disposable evaluation root.
 * @param caseDefinition The semantic case used to build the actor environment.
 * @returns A promise resolving to the actor repository.
 * @throws
 * - If the semantic case is invalid or the repository cannot be initialized
 */
export const createActorRepository = async (root, caseDefinition) => {
  validateSemanticCaseDefinition(caseDefinition);
  const repositoryPath = join(root, 'actor');
  await mkdir(join(repositoryPath, '.agents', 'skills'), { recursive: true });
  await cp(PORTABLE_SKILL_ROOT, join(repositoryPath, '.agents', 'skills', 'moldea'), {
    recursive: true,
  });
  await writeFile(join(repositoryPath, '.gitignore'), '.agents/\nnode_modules/\n', 'utf8');
  await writeFile(join(repositoryPath, 'README.md'), '# Evaluation repository\n', 'utf8');
  await seedScenarioRepository(repositoryPath, caseDefinition);

  for (const args of [
    ['init', '--quiet'],
    ['add', '--all'],
    [
      '-c',
      'user.name=moldea Evaluation',
      '-c',
      'user.email=evaluation@invalid.example',
      'commit',
      '--quiet',
      '-m',
      'test: initialize evaluation repository',
    ],
  ]) {
    const result = spawnSync('git', args, {
      cwd: repositoryPath,
      encoding: 'utf8',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Unable to initialize evaluation repository: ${result.stderr.trim()}`);
    }
  }

  await applyScenarioWorkingTree(repositoryPath, caseDefinition);
  return { repositoryPath };
};

/** Records repository-visible files without following symlinks. */
const snapshotWorkspace = async (root) => {
  const snapshot = new Map();

  const visit = async (directoryPath) => {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    for (const entry of entries) {
      if (
        EXCLUDED_SNAPSHOT_NAMES.has(entry.name) ||
        EXCLUDED_CONTEXT_DIRECTORY_NAMES.has(entry.name)
      ) {
        continue;
      }
      const absolutePath = join(directoryPath, entry.name);
      const relativePath = relative(root, absolutePath).replaceAll('\\', '/');
      const stats = await lstat(absolutePath);

      if (stats.isDirectory()) {
        await visit(absolutePath);
      } else if (stats.isSymbolicLink()) {
        snapshot.set(relativePath, {
          mode: stats.mode,
          target: await readlink(absolutePath),
          type: 'symlink',
        });
      } else if (stats.isFile()) {
        const fileContent = await readFile(absolutePath);
        let content = null;
        let omission = 'file-too-large';
        if (fileContent.byteLength <= MAX_WORKSPACE_EVIDENCE_FILE_BYTES) {
          try {
            content = new TextDecoder('utf-8', { fatal: true }).decode(fileContent);
            omission = null;
          } catch {
            omission = 'non-utf8';
          }
        }
        snapshot.set(relativePath, {
          content,
          mode: stats.mode,
          omission,
          sha256: createHash('sha256').update(fileContent).digest('hex'),
          type: 'file',
        });
      }
    }
  };

  await visit(root);
  return snapshot;
};

/** Produces a stable, content-aware workspace delta for the judge. */
const diffSnapshots = (before, after) => {
  const created = [];
  const deleted = [];
  const modified = [];

  for (const [path, state] of after) {
    if (!before.has(path)) created.push({ path, state });
    else if (JSON.stringify(before.get(path)) !== JSON.stringify(state)) {
      modified.push({ after: state, before: before.get(path), path });
    }
  }

  for (const [path, state] of before) {
    if (!after.has(path)) deleted.push({ path, state });
  }

  return { created, deleted, modified };
};

/** Builds the canonical result from one complete passing checkpoint. */
export const createSemanticEvaluationRecord = ({ candidate, caseDefinitions, generatedAt }) => {
  validateSemanticResultRecording({ candidate, caseDefinitions });
  const initialResultsById = new Map(candidate.results.map((result) => [result.id, result]));
  const results = caseDefinitions.map(({ id }) => {
    const initialResult = initialResultsById.get(id);
    if (initialResult?.passed) return initialResult;

    return candidate.confirmations
      .filter((confirmation) => confirmation.id === id)
      .sort((left, right) => left.confirmationIndex - right.confirmationIndex)
      .at(-1);
  });

  return {
    artifact: { sha256: candidate.artifactDigest },
    artifactDigest: candidate.artifactDigest,
    artifactSha256: candidate.artifactDigest,
    cases: results.map((result) => ({
      actorHost: result.actorHost,
      actorCommandPolicyEvidence: result.actorCommandPolicyEvidence,
      actorResponse: result.actorResponse,
      actorExecutionEvidence: result.actorExecutionEvidence,
      actorResourceEvidence: result.actorResourceEvidence,
      caseDefinitionDigest: result.caseDefinitionDigest,
      evaluatedAt: result.evaluatedAt,
      expectedSatisfied: result.observed,
      forbiddenTriggered: result.forbidden,
      id: result.id,
      judgeHost: result.judgeHost,
      passed: result.passed,
      rationale: result.rationale,
      repositoryControlEvidence: result.repositoryControlEvidence,
      scenarioEvidence: result.scenarioEvidence,
      workspaceChanges: result.workspaceChanges,
    })),
    caseSuiteDigest: candidate.caseSuiteDigest,
    caseHistories: caseDefinitions.map(({ id }) => ({
      confirmations: candidate.confirmations
        .filter((confirmation) => confirmation.id === id)
        .sort((left, right) => left.confirmationIndex - right.confirmationIndex),
      id,
      initial: initialResultsById.get(id),
      resolution: getSemanticCaseResolution(candidate, id),
    })),
    cli: candidate.cli,
    confirmationPolicy: {
      requiredPassingConfirmations: 2,
      version: 1,
    },
    coverageDigest: candidate.coverageDigest,
    evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
    evaluatedAt: generatedAt,
    generatedAt,
    hostContract: candidate.hostContract,
    results,
    schemaVersion: SEMANTIC_CHECKPOINT_SCHEMA_VERSION,
    skillDigest: candidate.artifactDigest,
  };
};

/** Stops checkpoint reuse when long-running evaluation inputs change mid-run. */
const assertSemanticEvaluationInputsUnchanged = async ({
  artifactDigest,
  caseSuiteDigest,
  cli,
  coverageDigest,
}) => {
  if (createPortableSkillDigest() !== artifactDigest) {
    throw new Error('The portable skill changed during semantic evaluation.');
  }
  const currentFixture = JSON.parse(await readFile(CASES_PATH, 'utf8'));
  if (createSemanticCaseSuiteDigest(currentFixture.semanticCases) !== caseSuiteDigest) {
    throw new Error('The semantic case suite changed during evaluation.');
  }
  const currentCoverage = JSON.parse(await readFile(COVERAGE_PATH, 'utf8'));
  if (
    createSemanticCoverageDigest(currentCoverage, currentFixture.semanticCases) !== coverageDigest
  ) {
    throw new Error('The semantic coverage contract changed during evaluation.');
  }
  if (JSON.stringify(createSemanticCliIdentity(REPOSITORY_ROOT)) !== JSON.stringify(cli)) {
    throw new Error('The release CLI changed during semantic evaluation.');
  }
};

/** Materializes and validates every evaluator-owned scenario without starting a model host. */
const runSemanticEvaluationPreflight = async (caseDefinitions, coverage) => {
  validateSemanticCoverage(coverage, caseDefinitions);

  for (const caseDefinition of caseDefinitions) {
    const evaluationRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-preflight-'));
    try {
      const { repositoryPath } = await createActorRepository(evaluationRoot, caseDefinition);
      const before = await captureRepositoryControlState(repositoryPath);
      const scenarioEvidence = await collectScenarioEvidence({
        caseDefinition,
        repositoryPath,
      });
      const after = await captureRepositoryControlState(repositoryPath);
      const repositoryControlEvidence = createRepositoryControlEvidence(before, after);

      if (!hasValidScenarioEvidence(scenarioEvidence, caseDefinition)) {
        throw new Error(`Preflight produced invalid scenario evidence for ${caseDefinition.id}.`);
      }
      if (
        !hasValidRepositoryControlEvidence(repositoryControlEvidence) ||
        repositoryControlEvidence.violations.length > 0
      ) {
        throw new Error(`Preflight changed repository controls for ${caseDefinition.id}.`);
      }
      if (buildActorPrompt(caseDefinition) !== caseDefinition.input.developerDirection) {
        throw new Error(`Preflight exposed an invalid actor prompt for ${caseDefinition.id}.`);
      }
    } finally {
      const expectedPrefix = join(tmpdir(), 'moldea-semantic-preflight-');
      if (!evaluationRoot.startsWith(expectedPrefix)) {
        throw new Error('Refusing to clean a preflight path outside the temporary prefix.');
      }
      await rm(evaluationRoot, { force: true, recursive: true });
    }
  }

  process.stderr.write(
    `[semantic-evaluation] preflight passed ${JSON.stringify(
      createSemanticEvaluationCostEstimate(caseDefinitions.length),
    )}\n`,
  );
};

/**
 * Publishes exact validated checkpoint bytes as one immutable semantic attempt.
 * @returns A promise that resolves with the recorded attempt.
 * @throws
 * - If the exact checkpoint evidence is invalid or cannot be persisted
 */
const recordSemanticCandidateAttempt = async (
  candidateEvidenceText,
  caseDefinitions,
  stopReason,
) => {
  const candidate = JSON.parse(candidateEvidenceText);
  validateSemanticCandidateEvidence(candidate, caseDefinitions);
  const attempt = await recordSemanticEvaluationAttempt({
    evidenceKind: 'candidate',
    evidenceText: candidateEvidenceText,
    resultsRoot: ATTEMPT_RESULTS_ROOT,
    stopReason,
    totalCaseCount: caseDefinitions.length,
  });
  process.stderr.write(`[semantic-evaluation] recorded immutable attempt ${attempt.attemptId}\n`);
  return attempt;
};

/** Returns the first case whose recorded failure still controls the run. */
const getBlockingSemanticCase = (candidate, caseDefinitions) =>
  caseDefinitions.find(({ id }) =>
    ['awaiting-confirmation', 'confirmed-failure'].includes(
      getSemanticCaseResolution(candidate, id),
    ),
  );

/** Decides whether the completed operation should return a failing process status. */
export const shouldFailSemanticEvaluation = ({
  candidate,
  caseDefinitions,
  hasFailures,
  isRecordRequested,
}) =>
  hasFailures ||
  (isRecordRequested &&
    (getPendingSemanticCaseDefinitions(candidate, caseDefinitions).length > 0 ||
      getBlockingSemanticCase(candidate, caseDefinitions) !== undefined));

/** Removes one evaluator-owned temporary root after validating its prefix. */
const removeSemanticEvaluationRoot = async (evaluationRoot) => {
  const expectedPrefix = join(tmpdir(), 'moldea-semantic-evaluation-');
  if (!evaluationRoot.startsWith(expectedPrefix)) {
    throw new Error('Refusing to clean an evaluation path outside the temporary prefix.');
  }
  await rm(evaluationRoot, { force: true, recursive: true });
};

/** Runs one isolated actor stage and returns all evidence needed by an independent judge. */
const evaluateActorStage = async (caseDefinition, actorCommand, cli) => {
  const evaluationRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-evaluation-'));

  try {
    const { repositoryPath: actorRepository } = await createActorRepository(
      evaluationRoot,
      caseDefinition,
    );
    const actorHome = join(evaluationRoot, 'actor-home');
    const actorToolDirectory = join(evaluationRoot, 'actor-tools');
    const actorToolMounts = await prepareSemanticEvaluationHome(actorHome, actorToolDirectory);

    const scenarioEvidence = await collectScenarioEvidence({
      caseDefinition,
      repositoryPath: actorRepository,
    });
    const repositoryControlBefore = await captureRepositoryControlState(actorRepository);
    const before = await snapshotWorkspace(actorRepository);
    const actorHost = identifyCodexEvaluationHost(actorCommand);
    createCompatibleSemanticEvaluationHostContract(actorHost, actorHost);
    const actorHostOutput = await runCodexEvaluationHost({
      command: actorCommand,
      cwd: actorRepository,
      prompt: buildActorPrompt(caseDefinition),
      readOnlyMounts: actorToolMounts,
      readOnlyWorkspacePaths: ['.git', '.agents/skills/moldea'],
      sandboxHome: actorHome,
    });
    const actorExecutionEvidenceOptions = {
      cliVersion: cli.version,
      jsonSchemaVersion: cli.jsonSchemaVersion,
    };
    const {
      actorCommandPolicyEvidence,
      actorExecutionEvidence,
      actorResourceEvidence,
      response: actorResponse,
      usage: actorUsage,
    } = parseSemanticEvaluationHostOutput(actorHostOutput, actorExecutionEvidenceOptions);
    const after = await snapshotWorkspace(actorRepository);
    const workspaceChanges = diffSnapshots(before, after);
    const repositoryControlAfter = await captureRepositoryControlState(actorRepository);
    const repositoryControlEvidence = createRepositoryControlEvidence(
      repositoryControlBefore,
      repositoryControlAfter,
    );
    return {
      actorHost,
      actorCommandPolicyEvidence,
      actorResponse,
      actorUsage,
      actorExecutionEvidence,
      actorResourceEvidence,
      repositoryControlEvidence,
      scenarioEvidence,
      workspaceChanges,
    };
  } finally {
    await removeSemanticEvaluationRoot(evaluationRoot);
  }
};

/** Runs one isolated judge stage from persisted actor evidence. */
const evaluateJudgeStage = async (caseDefinition, actorEvidence, judgeCommand, cli) => {
  const evaluationRoot = await mkdtemp(join(tmpdir(), 'moldea-semantic-evaluation-'));

  try {
    const judgeRepository = join(evaluationRoot, 'judge');
    const judgeHome = join(evaluationRoot, 'judge-home');
    await mkdir(judgeRepository, { recursive: true });
    await prepareCodexEvaluationHome(judgeHome);
    const judgeHost = identifyCodexEvaluationHost(judgeCommand);
    createCompatibleSemanticEvaluationHostContract(actorEvidence.actorHost, judgeHost);
    const judgeHostOutput = await runCodexEvaluationHost({
      command: judgeCommand,
      cwd: judgeRepository,
      prompt: buildJudgePrompt(
        caseDefinition,
        actorEvidence.actorResponse,
        actorEvidence.workspaceChanges,
        actorEvidence.actorExecutionEvidence,
        actorEvidence.scenarioEvidence,
        actorEvidence.repositoryControlEvidence,
        actorEvidence.actorCommandPolicyEvidence,
        actorEvidence.actorResourceEvidence,
      ),
      sandboxHome: judgeHome,
      workspaceAccess: 'read-only',
    });
    const actorExecutionEvidenceOptions = {
      cliVersion: cli.version,
      jsonSchemaVersion: cli.jsonSchemaVersion,
    };
    const { response: judgeResponse, usage: judgeUsage } = parseSemanticEvaluationHostOutput(
      judgeHostOutput,
      actorExecutionEvidenceOptions,
    );
    const assessment = assessJudgeOutput(caseDefinition, judgeResponse);

    return {
      ...actorEvidence,
      caseId: caseDefinition.id,
      forbidden: assessment.forbidden,
      id: caseDefinition.id,
      judgeHost,
      judgeUsage,
      observed: assessment.observed,
      passed:
        assessment.isPassed &&
        hasPassingCaseMoldeaResourceBudget(caseDefinition, actorEvidence.actorResourceEvidence) &&
        actorEvidence.repositoryControlEvidence.violations.length === 0,
      rationale: assessment.rationale,
    };
  } finally {
    await removeSemanticEvaluationRoot(evaluationRoot);
  }
};

/**
 * Runs or resumes one semantic trial while checkpointing every model-stage boundary.
 * @returns A promise resolving to the completed active trial and judged result.
 */
export const runSemanticCaseTrial = async ({
  activeTrial,
  actorCommand,
  caseDefinition,
  cli,
  confirmationIndex = null,
  evaluateActor = evaluateActorStage,
  evaluateJudge = evaluateJudgeStage,
  judgeCommand,
  now = () => new Date().toISOString(),
  persistActiveTrial = async () => {},
  runOperationalStage = runCodexEvaluationOperationalStage,
  writeStatus = (message) => process.stderr.write(message),
}) => {
  let currentTrial = activeTrial;
  if (currentTrial === null) {
    currentTrial = createSemanticActiveTrial(caseDefinition, confirmationIndex, now());
    await persistActiveTrial(currentTrial);
  }

  if (currentTrial.phase === 'actor-pending') {
    const actorEvidence = await runOperationalStage({
      initialFailureCount: currentTrial.operationalRetries.actorFailureCount,
      maximumRetryCount: SEMANTIC_MAXIMUM_OPERATIONAL_RETRY_COUNT,
      onRetry: async (retry) => {
        currentTrial = appendSemanticActiveTrialRetry(currentTrial, 'actor', retry);
        await persistActiveTrial(currentTrial);
        writeStatus(
          `[semantic-evaluation] actor operational failure ${retry.category}; retry ${retry.failureCount} in ${retry.retryDelayMs}ms\n`,
        );
      },
      operation: () => evaluateActor(caseDefinition, actorCommand, cli),
    });
    currentTrial = attachSemanticActiveTrialActorEvidence(currentTrial, actorEvidence, now());
    await persistActiveTrial(currentTrial);
  }

  if (currentTrial.phase === 'judge-pending') {
    const result = await runOperationalStage({
      initialFailureCount: currentTrial.operationalRetries.judgeFailureCount,
      maximumRetryCount: SEMANTIC_MAXIMUM_OPERATIONAL_RETRY_COUNT,
      onRetry: async (retry) => {
        currentTrial = appendSemanticActiveTrialRetry(currentTrial, 'judge', retry);
        await persistActiveTrial(currentTrial);
        writeStatus(
          `[semantic-evaluation] judge operational failure ${retry.category}; retry ${retry.failureCount} in ${retry.retryDelayMs}ms\n`,
        );
      },
      operation: () => evaluateJudge(caseDefinition, currentTrial.actorEvidence, judgeCommand, cli),
    });
    currentTrial = completeSemanticActiveTrial(currentTrial, result, now());
    await persistActiveTrial(currentTrial);
  }

  if (currentTrial.phase !== 'trial-complete') {
    throw new Error('Semantic trial did not reach a complete stage.');
  }

  return { activeTrial: currentTrial, result: currentTrial.result };
};

/** Runs blind forward evaluation with artifact-bound checkpoint and promotion semantics. */
const main = async () => {
  const fixture = JSON.parse(await readFile(CASES_PATH, 'utf8'));
  const caseDefinitions = fixture.semanticCases;
  const coverage = JSON.parse(await readFile(COVERAGE_PATH, 'utf8'));
  const {
    isPreflightRequested,
    isRecordRequested,
    isRecordCheckpointRequested,
    isRestartRequested,
    isVerifyAttemptsRequested,
    requestedCaseId,
  } = parseSemanticEvaluationArguments(process.argv.slice(2));
  if (isPreflightRequested) {
    await runSemanticEvaluationPreflight(caseDefinitions, coverage);
    return;
  }
  if (isVerifyAttemptsRequested) {
    const verification = await verifySemanticEvaluationAttempts(ATTEMPT_RESULTS_ROOT);
    process.stdout.write(`${JSON.stringify(verification, null, 2)}\n`);
    if (!verification.passed) process.exitCode = 1;
    return;
  }

  const artifactDigest = createPortableSkillDigest();
  const caseSuiteDigest = createSemanticCaseSuiteDigest(caseDefinitions);
  const coverageDigest = createSemanticCoverageDigest(coverage, caseDefinitions);
  const cli = createSemanticCliIdentity(REPOSITORY_ROOT);
  if (isRecordCheckpointRequested) {
    const candidateEvidenceText = await readSemanticEvaluationCandidateEvidenceText();
    if (candidateEvidenceText === null) {
      throw new Error('No semantic evaluation checkpoint is available to record.');
    }
    await recordSemanticCandidateCheckpoint({
      candidateEvidenceText,
      currentBoundary: {
        artifactDigest,
        caseDefinitions,
        cli,
        coverageDigest,
      },
      recordAttempt: (validatedCandidateEvidenceText) =>
        recordSemanticCandidateAttempt(
          validatedCandidateEvidenceText,
          caseDefinitions,
          'operator-recorded',
        ),
    });
    return;
  }

  const actorBaseCommand = parseCodexEvaluationHostCommand('MOLDEA_EVAL_ACTOR_COMMAND_JSON');
  const judgeBaseCommand = parseCodexEvaluationHostCommand(
    'MOLDEA_EVAL_JUDGE_COMMAND_JSON',
    actorBaseCommand,
  );
  const actorCommand = buildSemanticEvaluationHostCommand(actorBaseCommand);
  const judgeCommand = buildSemanticEvaluationHostCommand(judgeBaseCommand);
  const requestedCaseDefinition = requestedCaseId
    ? caseDefinitions.find(({ id }) => id === requestedCaseId)
    : undefined;
  if (requestedCaseId && !requestedCaseDefinition) {
    throw new Error(`Unknown semantic evaluation case: ${requestedCaseId}`);
  }
  const actorHost = identifyCodexEvaluationHost(actorCommand);
  const judgeHost = identifyCodexEvaluationHost(judgeCommand);
  const hostContract = createCompatibleSemanticEvaluationHostContract(actorHost, judgeHost);
  const evidenceBoundary = {
    actorHost,
    artifactDigest,
    caseDefinitions,
    cli,
    coverageDigest,
    judgeHost,
  };
  let candidate = null;
  if (isRecordRequested) {
    candidate = isRestartRequested ? null : await readSemanticEvaluationCandidate();
    if (candidate) {
      validateSemanticCandidateCompatibility(candidate, evidenceBoundary);
    } else {
      if (requestedCaseId) {
        throw new Error(
          'A targeted recording requires an existing compatible semantic evaluation candidate.',
        );
      }
      const generatedAt = new Date().toISOString();
      candidate = createSemanticEvaluationCandidate({
        ...evidenceBoundary,
        generatedAt,
      });
      await writeSemanticEvaluationCandidate(candidate);
    }
  }

  const blockingCase = isRecordRequested
    ? getBlockingSemanticCase(candidate, caseDefinitions)
    : undefined;
  if (
    blockingCase !== undefined &&
    getSemanticCaseResolution(candidate, blockingCase.id) === 'confirmed-failure'
  ) {
    throw new Error(
      `Semantic case ${blockingCase.id} has a confirmed failure; start a fresh full candidate with --record --restart after correcting its root cause.`,
    );
  }

  const pendingCaseDefinitions = isRecordRequested
    ? getPendingSemanticCaseDefinitions(candidate, caseDefinitions)
    : [];
  const selectedCaseDefinitions = requestedCaseDefinition
    ? [requestedCaseDefinition]
    : isRecordRequested
      ? [
          ...(blockingCase === undefined ? [] : [blockingCase]),
          ...pendingCaseDefinitions.filter(({ id }) => id !== blockingCase?.id),
        ]
      : caseDefinitions;
  const results = [];
  if (isRecordRequested && !requestedCaseId) {
    const completedCount = caseDefinitions.length - selectedCaseDefinitions.length;
    process.stderr.write(
      `[semantic-evaluation] resume ${completedCount} completed, ${selectedCaseDefinitions.length} pending\n`,
    );
  }

  for (const caseDefinition of selectedCaseDefinitions) {
    while (true) {
      const resolution = candidate
        ? getSemanticCaseResolution(candidate, caseDefinition.id)
        : 'pending';
      if (['passed', 'recovered', 'confirmed-failure'].includes(resolution)) break;
      const confirmationIndex =
        resolution === 'awaiting-confirmation'
          ? candidate.confirmations.filter(({ id }) => id === caseDefinition.id).length + 1
          : null;
      if (
        candidate?.activeTrial !== null &&
        candidate?.activeTrial !== undefined &&
        (candidate.activeTrial.caseId !== caseDefinition.id ||
          candidate.activeTrial.confirmationIndex !== confirmationIndex)
      ) {
        throw new Error('The active semantic trial does not match the next selected trial.');
      }
      await assertSemanticEvaluationInputsUnchanged({
        artifactDigest,
        caseSuiteDigest,
        cli,
        coverageDigest,
      });
      const trialLabel =
        confirmationIndex === null ? 'initial' : `confirmation ${confirmationIndex}`;
      process.stderr.write(`[semantic-evaluation] start ${caseDefinition.id} (${trialLabel})\n`);
      const persistActiveTrial = candidate
        ? async (activeTrial) => {
            candidate = {
              ...candidate,
              activeTrial,
              updatedAt: activeTrial.updatedAt,
            };
            validateSemanticCandidateCompatibility(candidate, evidenceBoundary);
            await writeSemanticEvaluationCandidate(candidate);
          }
        : async () => {};
      const { activeTrial, result } = await runSemanticCaseTrial({
        activeTrial: candidate?.activeTrial ?? null,
        actorCommand,
        caseDefinition,
        cli,
        confirmationIndex,
        evaluateActor: async (...parameters) => {
          await assertSemanticEvaluationInputsUnchanged({
            artifactDigest,
            caseSuiteDigest,
            cli,
            coverageDigest,
          });
          return evaluateActorStage(...parameters);
        },
        evaluateJudge: async (...parameters) => {
          await assertSemanticEvaluationInputsUnchanged({
            artifactDigest,
            caseSuiteDigest,
            cli,
            coverageDigest,
          });
          return evaluateJudgeStage(...parameters);
        },
        judgeCommand,
        persistActiveTrial,
      });
      await assertSemanticEvaluationInputsUnchanged({
        artifactDigest,
        caseSuiteDigest,
        cli,
        coverageDigest,
      });
      results.push(result);
      if (candidate) {
        const candidateWithoutActiveTrial = { ...candidate, activeTrial: null };
        candidate =
          activeTrial.trialKind === 'confirmation'
            ? appendSemanticCandidateConfirmation(
                candidateWithoutActiveTrial,
                caseDefinition,
                result,
                result.evaluatedAt,
              )
            : appendSemanticCandidateInitialResult(
                candidateWithoutActiveTrial,
                caseDefinition,
                result,
                result.evaluatedAt,
              );
        await writeSemanticEvaluationCandidate(candidate);
      }
      process.stderr.write(
        `[semantic-evaluation] ${result.passed ? 'pass' : 'fail'} ${caseDefinition.id} (${trialLabel})\n`,
      );
      if (!isRecordRequested) break;
    }
    if (
      isRecordRequested &&
      getSemanticCaseResolution(candidate, caseDefinition.id) === 'confirmed-failure'
    ) {
      break;
    }
  }

  const hasFailures = !isRecordRequested && results.some((result) => !result.passed);
  if (isRecordRequested) {
    validateSemanticCandidateCompatibility(candidate, evidenceBoundary);
    await assertSemanticEvaluationInputsUnchanged({
      artifactDigest,
      caseSuiteDigest,
      cli,
      coverageDigest,
    });
    const pendingCaseDefinitions = getPendingSemanticCaseDefinitions(candidate, caseDefinitions);
    const blockingCase = getBlockingSemanticCase(candidate, caseDefinitions);
    const hasCompletePassingCandidate =
      pendingCaseDefinitions.length === 0 && blockingCase === undefined;
    const stopReason = hasCompletePassingCandidate
      ? 'complete'
      : blockingCase !== undefined &&
          getSemanticCaseResolution(candidate, blockingCase.id) === 'confirmed-failure'
        ? 'confirmation-failure'
        : 'case-failure';
    const candidateEvidenceText = `${JSON.stringify(candidate, null, 2)}\n`;
    const attempt = await recordSemanticCandidateAttempt(
      candidateEvidenceText,
      caseDefinitions,
      stopReason,
    );
    if (hasCompletePassingCandidate) {
      const generatedAt = new Date().toISOString();
      const record = createSemanticEvaluationRecord({
        candidate,
        caseDefinitions,
        generatedAt,
      });
      record.semanticAttemptId = attempt.attemptId;
      await writeJsonAtomically(RESULT_PATH, record);
      await rm(CANDIDATE_RESULT_PATH, { force: true });
      process.stderr.write('[semantic-evaluation] promoted complete passing evidence\n');
    } else {
      process.stderr.write(
        `[semantic-evaluation] checkpoint preserved with ${pendingCaseDefinitions.length} pending or failing case(s)\n`,
      );
    }
  } else {
    const evaluatedAt = new Date().toISOString();
    const standaloneRecord = {
      artifact: { sha256: artifactDigest },
      artifactDigest,
      artifactSha256: artifactDigest,
      cases: results.map((result) => ({
        actorHost: result.actorHost,
        actorCommandPolicyEvidence: result.actorCommandPolicyEvidence,
        actorResponse: result.actorResponse,
        actorExecutionEvidence: result.actorExecutionEvidence,
        actorResourceEvidence: result.actorResourceEvidence,
        caseDefinitionDigest: result.caseDefinitionDigest,
        evaluatedAt: result.evaluatedAt,
        expectedSatisfied: result.observed,
        forbiddenTriggered: result.forbidden,
        id: result.id,
        judgeHost: result.judgeHost,
        passed: result.passed,
        rationale: result.rationale,
        repositoryControlEvidence: result.repositoryControlEvidence,
        scenarioEvidence: result.scenarioEvidence,
        workspaceChanges: result.workspaceChanges,
      })),
      caseSuiteDigest,
      cli,
      confirmationPolicy: {
        requiredPassingConfirmations: 2,
        version: 1,
      },
      coverageDigest,
      evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
      evaluatedAt,
      generatedAt: evaluatedAt,
      hostContract,
      results,
      schemaVersion: SEMANTIC_CHECKPOINT_SCHEMA_VERSION,
      skillDigest: artifactDigest,
    };
    process.stdout.write(`${JSON.stringify(standaloneRecord, null, 2)}\n`);
  }

  if (
    shouldFailSemanticEvaluation({
      candidate,
      caseDefinitions,
      hasFailures,
      isRecordRequested,
    })
  ) {
    process.exitCode = 1;
  }
};

const isDirectExecution =
  process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isDirectExecution) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
