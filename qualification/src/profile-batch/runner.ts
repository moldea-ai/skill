import { randomUUID } from 'node:crypto';
import { access, lstat, readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  EVALUATION_BATCH_DEFAULT_WORKER_COUNT,
  runOrderedEvaluationBatch,
  type IEvaluationBatchWorkerCount,
} from '../../../tooling/evaluation-batch/index.mjs';

import {
  loadRuntimeCompatibilitySnapshot,
  resolveQualificationTarget,
} from '../compatibility/index.ts';
import { inspectQualificationBaseline } from '../baseline/index.ts';
import { prepareCandidateClosure } from '../candidate-closure/index.ts';
import {
  DEFAULT_PACKAGES_REPOSITORY,
  DEFAULT_SKILL_REPOSITORY,
  QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
  QUALIFICATION_PROFILES_ROOT,
  QUALIFICATION_RESULTS_ROOT,
} from '../constants/index.ts';
import {
  QualificationAttemptResultDraftSchema,
  QualificationExecutionEnvironmentSchema,
  type IQualificationAttemptCheckpoint,
  type IQualificationAttemptResult,
  type IQualificationSelection,
} from '../contracts/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import { readAttemptCheckpoint } from '../checkpoint/index.ts';
import {
  assertQualificationBatchDiskAdmission,
  coalesceQualificationPaidExecutionApproval,
  createQualificationBatchTokenController,
  getLocalAttemptDirectory,
  getQualificationMaximumCallCount,
  getQualificationModelUsageTokenCount,
  getQualificationMaximumTokenCount,
  getQualificationPlannedCallCount,
  inspectQualificationExecutionEnvironment,
  inspectQualificationInputState,
  runQualification,
  type IQualificationOperationalRetryOptions,
  type IQualificationPaidExecutionRequest,
  type IQualificationProgress,
} from '../execution/index.ts';
import {
  calculateDirectoryFingerprint,
  calculateSha256,
  readJsonFile,
  resolveContainedPath,
  writeTextFileAtomically,
  type IBoundarySchema,
} from '../filesystem/index.ts';
import { loadQualificationProfileIndex } from '../storage/index.ts';
import {
  QUALIFICATION_PROFILE_BATCH_CHECKPOINT_PATH,
  QUALIFICATION_PROFILE_BATCH_HISTORY_ROOT,
  QUALIFICATION_PROFILE_BATCH_LEDGER_PATH,
  QUALIFICATION_PROFILE_BATCH_OUTPUT_MAXIMUM_BYTE_COUNT,
  QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
  QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT,
  QUALIFICATION_PROFILE_BATCH_SUMMARY_MAXIMUM_BYTE_COUNT,
} from './constants.ts';
import {
  QualificationProfileBatchCheckpointSchema,
  QualificationProfileBatchLedgerSchema,
  QualificationProfileBatchRecordSchema,
  QualificationProfileBatchSelectorSchema,
  type IQualificationProfileBatchCheckpoint,
  type IQualificationProfileBatchLedger,
  type IQualificationProfileBatchOutcome,
  type IQualificationProfileBatchRecord,
  type IQualificationProfileBatchSelector,
  type IQualificationProfileBatchSelectorInput,
} from './types.ts';

const BATCH_ID_PATTERN = /^b-[a-f0-9]{32}$/u;

class QualificationProfileWorkerStopError extends Error {
  public readonly attemptId: string;
  public readonly kind:
    | 'candidate-token-limit'
    | 'execution-error'
    | 'operational-stop'
    | 'operational-recovery-exhausted'
    | 'temporary-storage-limit';
  public readonly targetId: string;

  public constructor(
    attemptId: string,
    targetId: string,
    kind: QualificationProfileWorkerStopError['kind'],
    message: string,
  ) {
    super(message);
    this.name = 'QualificationProfileWorkerStopError';
    this.attemptId = attemptId;
    this.kind = kind;
    this.targetId = targetId;
  }
}

const hasPath = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const createTargetId = (selection: IQualificationSelection): string =>
  `${selection.adapterId}/${selection.implementationId}`;

/** Validates one worker result and preserves its actionable operational stop summary. */
export const assertQualificationProfileWorkerResult = (
  attemptId: string,
  targetId: string,
  result: Pick<IQualificationAttemptResult, 'selection' | 'status' | 'summary'>,
  stages: IQualificationAttemptCheckpoint['stages'],
): void => {
  if (createTargetId(result.selection) !== targetId) {
    throw new QualificationProfileWorkerStopError(
      attemptId,
      targetId,
      'execution-error',
      `Qualification target ${targetId} did not produce one matching terminal result.`,
    );
  }
  if (result.status === 'incomplete') {
    const stoppedStage = Object.values(stages).find(({ status }) => status === 'stopped');
    const kind =
      stoppedStage?.hasUsedOperationalStopResume === true
        ? 'operational-recovery-exhausted'
        : stoppedStage !== undefined
          ? 'operational-stop'
          : result.summary.includes('candidate token boundary')
            ? 'candidate-token-limit'
            : result.summary.includes('temporary-storage boundary')
              ? 'temporary-storage-limit'
              : 'execution-error';
    throw new QualificationProfileWorkerStopError(attemptId, targetId, kind, result.summary);
  }
  if (result.status === 'errored') {
    throw new QualificationProfileWorkerStopError(
      attemptId,
      targetId,
      'execution-error',
      result.summary,
    );
  }
};

const parseTargetId = (targetId: string): IQualificationSelection => {
  const [adapterId, implementationId, unexpected] = targetId.split('/');
  if (
    adapterId === undefined ||
    adapterId === '' ||
    implementationId === undefined ||
    implementationId === '' ||
    unexpected !== undefined
  ) {
    throw new Error(`Invalid qualification target: ${targetId}.`);
  }
  return { adapterId, implementationId };
};

const parseTargetValues = (value: string | null, optionName: string): string[] => {
  if (value === null) throw new Error(`${optionName} requires one comma-separated value.`);
  const values = value.split(',').map((entry) => entry.trim());
  if (values.some((entry) => entry.length === 0) || new Set(values).size !== values.length) {
    throw new Error(`${optionName} requires unique non-empty comma-separated values.`);
  }
  return values;
};

const getHistoryPath = (historyRoot: string, batchId: string): string => {
  if (!BATCH_ID_PATTERN.test(batchId)) {
    throw new Error(`Invalid qualification profile batch id: ${batchId}.`);
  }
  return resolveContainedPath(historyRoot, `${batchId}.json`);
};

/** Reads one profile-batch file only after enforcing its regular-file and byte boundaries. */
export const readQualificationProfileBatchState = async <TResult>(
  filePath: string,
  schema: IBoundarySchema<TResult>,
): Promise<TResult | null> => {
  if (!(await hasPath(filePath))) return null;
  const fileStats = await lstat(filePath);
  if (
    !fileStats.isFile() ||
    fileStats.size > QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT
  ) {
    throw new Error('Qualification profile-batch state is not one bounded regular file.');
  }
  const content = await readFile(filePath);
  if (content.byteLength > QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT) {
    throw new Error('Qualification profile-batch state exceeds its UTF-8 byte limit.');
  }
  return schema.parse(JSON.parse(content.toString('utf8')) as unknown);
};

/** Atomically replaces one profile-batch file when its encoded state fits the fixed boundary. */
export const writeQualificationProfileBatchState = async (
  filePath: string,
  state: unknown,
): Promise<void> => {
  const content = `${JSON.stringify(state, null, 2)}\n`;
  if (Buffer.byteLength(content, 'utf8') > QUALIFICATION_PROFILE_BATCH_STATE_MAXIMUM_BYTE_COUNT) {
    throw new Error('Qualification profile-batch state exceeds its UTF-8 byte limit.');
  }
  await writeTextFileAtomically(filePath, content);
};

const resolveProfileSelector = async (options: {
  historyRoot: string;
  input: IQualificationProfileBatchSelectorInput;
}): Promise<IQualificationProfileBatchSelector> => {
  const index = await loadQualificationProfileIndex();
  const adapterTargetIds = index.targets
    .filter(
      ({ adapterId, implementationId }) => adapterId !== 'custom' || implementationId !== 'custom',
    )
    .map(createTargetId);
  let targetIds: string[];

  if (options.input.kind === 'all') {
    if (options.input.value !== null) throw new Error('--all does not accept a value.');
    targetIds = adapterTargetIds;
  } else if (options.input.kind === 'targets') {
    const requestedTargetIds = parseTargetValues(options.input.value, '--targets');
    const unknownTargetIds = requestedTargetIds.filter(
      (targetId) => !adapterTargetIds.includes(targetId),
    );
    if (unknownTargetIds.length > 0) {
      throw new Error(`Unknown qualification targets: ${unknownTargetIds.join(', ')}.`);
    }
    targetIds = adapterTargetIds.filter((targetId) => requestedTargetIds.includes(targetId));
  } else {
    const [batchId] = parseTargetValues(options.input.value, '--unresolved-from');
    if (batchId === undefined || options.input.value?.includes(',')) {
      throw new Error('--unresolved-from requires exactly one batch id.');
    }
    const priorLedger = await readQualificationProfileBatchState(
      getHistoryPath(options.historyRoot, batchId),
      QualificationProfileBatchLedgerSchema,
    );
    if (priorLedger === null)
      throw new Error(`Qualification profile batch ${batchId} was not found.`);
    const passedTargetIds = new Set(
      priorLedger.records
        .filter(({ status }) => status === 'passed')
        .map(({ adapterId, implementationId }) => createTargetId({ adapterId, implementationId })),
    );
    targetIds = priorLedger.selector.targetIds.filter((targetId) => !passedTargetIds.has(targetId));
    if (targetIds.length === 0) {
      throw new Error(`Qualification profile batch ${batchId} has no unresolved targets.`);
    }
  }

  return QualificationProfileBatchSelectorSchema.parse({
    kind: options.input.kind,
    value: options.input.value,
    targetIds,
  });
};

const createBatchIdentity = (options: {
  executionEnvironment: IQualificationProfileBatchCheckpoint['executionEnvironment'];
  isDryRun: boolean;
  packagesRepository: string;
  packagesRepositoryCommit: string;
  packagesRepositoryFingerprint: string;
  profileIndexDigest: string;
  qualificationDigest: string;
  reuseEvidence: boolean;
  selector: IQualificationProfileBatchSelector;
  skillDigest: string;
  skillRepository: string;
}): string =>
  calculateSha256(
    `${JSON.stringify({
      selector: options.selector,
      packagesRepository: options.packagesRepository,
      skillRepository: options.skillRepository,
      isDryRun: options.isDryRun,
      reuseEvidence: options.reuseEvidence,
      profileIndexDigest: options.profileIndexDigest,
      qualificationDigest: options.qualificationDigest,
      skillDigest: options.skillDigest,
      packagesRepositoryCommit: options.packagesRepositoryCommit,
      packagesRepositoryFingerprint: options.packagesRepositoryFingerprint,
      executionEnvironment: QualificationExecutionEnvironmentSchema.parse(
        options.executionEnvironment,
      ),
    })}\n`,
  );

const validateBatchState = (options: {
  checkpoint: IQualificationProfileBatchCheckpoint | null;
  identitySha256: string;
  ledger: IQualificationProfileBatchLedger;
  selector: IQualificationProfileBatchSelector;
}): void => {
  const { checkpoint, identitySha256, ledger, selector } = options;
  const hasValidLedger =
    ledger.identitySha256 === identitySha256 &&
    JSON.stringify(ledger.selector) === JSON.stringify(selector) &&
    ledger.records.length <= selector.targetIds.length &&
    ledger.records.every(
      ({ adapterId, implementationId }, index) =>
        createTargetId({ adapterId, implementationId }) === selector.targetIds[index],
    ) &&
    ledger.candidateTokensConsumed ===
      ledger.records.reduce((total, record) => total + record.candidateTokensConsumed, 0);
  if (!hasValidLedger) {
    throw new Error(
      'Qualification profile-batch ledger does not match the current batch identity.',
    );
  }
  if (checkpoint === null) {
    if (ledger.records.length !== selector.targetIds.length) {
      throw new Error('Incomplete qualification profile-batch ledger has no private checkpoint.');
    }
    return;
  }
  const targetIds = Object.keys(checkpoint.attemptIds);
  const attemptIds = Object.values(checkpoint.attemptIds);
  const expectedIdentitySha256 = createBatchIdentity({
    executionEnvironment: checkpoint.executionEnvironment,
    isDryRun: checkpoint.isDryRun,
    packagesRepository: checkpoint.packagesRepository,
    packagesRepositoryCommit: checkpoint.packagesRepositoryCommit,
    packagesRepositoryFingerprint: checkpoint.packagesRepositoryFingerprint,
    profileIndexDigest: checkpoint.profileIndexDigest,
    qualificationDigest: checkpoint.qualificationDigest,
    reuseEvidence: checkpoint.reuseEvidence,
    selector: checkpoint.selector,
    skillDigest: checkpoint.skillDigest,
    skillRepository: checkpoint.skillRepository,
  });
  if (
    checkpoint.identitySha256 !== identitySha256 ||
    expectedIdentitySha256 !== identitySha256 ||
    checkpoint.batchId !== ledger.batchId ||
    JSON.stringify(targetIds) !== JSON.stringify(selector.targetIds) ||
    new Set(attemptIds).size !== attemptIds.length ||
    (checkpoint.stop !== null &&
      checkpoint.attemptIds[checkpoint.stop.targetId] !== checkpoint.stop.attemptId)
  ) {
    throw new Error(
      'Qualification profile-batch checkpoint does not match the current batch identity.',
    );
  }
};

const getAttemptCheckpoint = async (
  attemptId: string,
): Promise<Awaited<ReturnType<typeof readAttemptCheckpoint>> | null> => {
  const attemptDirectory = getLocalAttemptDirectory(attemptId);
  if (!(await hasPath(path.join(attemptDirectory, 'checkpoint.json')))) return null;
  return readAttemptCheckpoint(attemptDirectory);
};

const assertMappedAttempt = (options: {
  attempt: Awaited<ReturnType<typeof readAttemptCheckpoint>>;
  isDryRun: boolean;
  selection: IQualificationSelection;
}): void => {
  if (
    options.attempt.mode !== (options.isDryRun ? 'dry-run' : 'official') ||
    JSON.stringify(options.attempt.selection) !== JSON.stringify(options.selection)
  ) {
    throw new Error(
      `Mapped qualification attempt ${options.attempt.attemptId} does not match ${createTargetId(options.selection)}.`,
    );
  }
};

const createRecord = (
  result: IQualificationAttemptResult,
  candidateTokensConsumed: number,
): IQualificationProfileBatchRecord => {
  if (result.status !== 'passed' && result.status !== 'failed') {
    throw new Error(`Qualification attempt ${result.attemptId} is not terminal.`);
  }
  if (
    Buffer.byteLength(result.summary, 'utf8') >
    QUALIFICATION_PROFILE_BATCH_SUMMARY_MAXIMUM_BYTE_COUNT
  ) {
    throw new Error('Qualification profile-batch summary exceeds its UTF-8 byte limit.');
  }
  const trials = result.cases.flatMap(({ trials: caseTrials }) => caseTrials);
  return QualificationProfileBatchRecordSchema.parse({
    schemaVersion: QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
    attemptId: result.attemptId,
    adapterId: result.selection.adapterId,
    implementationId: result.selection.implementationId,
    status: result.status,
    summary: result.summary,
    caseCount: result.cases.length,
    failedCaseCount: result.cases.filter(({ status }) => status === 'failed').length,
    recoveredCaseCount: result.cases.filter(({ status }) => status === 'recovered').length,
    modelCallCount: trials.reduce(
      (total, trial) =>
        total +
        (trial.actorUsage === null || trial.actorReuseSourceAttemptId !== null ? 0 : 1) +
        (trial.judgeUsage === null || trial.judgeReuseSourceAttemptId !== null ? 0 : 1),
      0,
    ),
    modelTokenCount: trials.reduce(
      (total, trial) =>
        total +
        (trial.actorUsage === null ? 0 : getQualificationModelUsageTokenCount(trial.actorUsage)) +
        (trial.judgeUsage === null ? 0 : getQualificationModelUsageTokenCount(trial.judgeUsage)),
      0,
    ),
    candidateTokensConsumed,
    durationMs: result.cases.reduce((total, caseResult) => total + caseResult.durationMs, 0),
  });
};

const getActiveAttemptIds = async (options: {
  checkpoint: IQualificationProfileBatchCheckpoint | null;
  ledger: IQualificationProfileBatchLedger;
}): Promise<string[]> => {
  if (options.checkpoint === null) return [];
  const committedTargetIds = new Set(
    options.ledger.records.map(({ adapterId, implementationId }) =>
      createTargetId({ adapterId, implementationId }),
    ),
  );
  const activeAttemptIds: string[] = [];
  for (const targetId of options.checkpoint.selector.targetIds) {
    const attemptId = options.checkpoint.attemptIds[targetId];
    if (
      !committedTargetIds.has(targetId) &&
      attemptId !== undefined &&
      (await hasPath(path.join(getLocalAttemptDirectory(attemptId), 'checkpoint.json')))
    ) {
      activeAttemptIds.push(attemptId);
    }
  }
  return activeAttemptIds;
};

const getProfileBatchCandidateTokenCount = async (options: {
  checkpoint: IQualificationProfileBatchCheckpoint;
  ledger: IQualificationProfileBatchLedger;
}): Promise<number> => {
  const committedTargetIds = new Set(
    options.ledger.records.map(({ adapterId, implementationId }) =>
      createTargetId({ adapterId, implementationId }),
    ),
  );
  let candidateTokensConsumed = options.ledger.candidateTokensConsumed;

  for (const targetId of options.checkpoint.selector.targetIds) {
    if (committedTargetIds.has(targetId)) continue;
    const attemptId = options.checkpoint.attemptIds[targetId];
    if (attemptId === undefined) throw new Error(`Target ${targetId} has no mapped attempt.`);
    const attemptCheckpoint = await getAttemptCheckpoint(attemptId);
    if (attemptCheckpoint !== null) {
      assertMappedAttempt({
        attempt: attemptCheckpoint,
        isDryRun: options.checkpoint.isDryRun,
        selection: parseTargetId(targetId),
      });
      candidateTokensConsumed +=
        attemptCheckpoint.candidateTokensConsumed + attemptCheckpoint.candidateTokensReserved;
    }
  }

  const candidateTokenLimit =
    options.checkpoint.selector.targetIds.length * QUALIFICATION_CANDIDATE_TOKEN_LIMIT;
  if (candidateTokensConsumed > candidateTokenLimit) {
    throw new Error('Qualification profile-batch candidate-token state exceeds its fixed limit.');
  }
  return candidateTokensConsumed;
};

const createOutcome = async (options: {
  checkpoint: IQualificationProfileBatchCheckpoint | null;
  ledger: IQualificationProfileBatchLedger;
}): Promise<IQualificationProfileBatchOutcome> => ({
  status: options.checkpoint === null ? 'completed' : 'incomplete',
  batchId: options.ledger.batchId,
  identitySha256: options.ledger.identitySha256,
  selector: options.ledger.selector,
  isDryRun: options.ledger.isDryRun,
  candidateTokensConsumed: options.ledger.candidateTokensConsumed,
  activeAttemptIds: await getActiveAttemptIds(options),
  records: options.ledger.records,
});

/** Rejects any final profile-batch output that would exceed its independent stdout boundary. */
export const assertQualificationProfileBatchOutputSize = (
  outcome: IQualificationProfileBatchOutcome,
): void => {
  if (
    Buffer.byteLength(`${JSON.stringify(outcome, null, 2)}\n`, 'utf8') >
    QUALIFICATION_PROFILE_BATCH_OUTPUT_MAXIMUM_BYTE_COUNT
  ) {
    throw new Error('Qualification profile-batch output exceeds its UTF-8 byte limit.');
  }
};

const createAttemptId = (selection: IQualificationSelection): string => {
  const timestamp = new Date().toISOString().replace(/[-:.]/gu, '');
  return `${timestamp}-${selection.adapterId}-${selection.implementationId}-${randomUUID().slice(0, 8)}`;
};

const assertExactCustomBaseline = async (options: {
  customInputState: Awaited<ReturnType<typeof inspectQualificationInputState>>;
  customTargetDigest: string;
  executionEnvironment: IQualificationProfileBatchCheckpoint['executionEnvironment'];
  firstSelection: IQualificationSelection;
  isDryRun: boolean;
  matrix: Awaited<ReturnType<typeof loadRuntimeCompatibilitySnapshot>>['matrix'];
  packagesRepository: string;
  resultsRoot: string;
  stateDirectory: string;
}): Promise<void> => {
  if (options.isDryRun) return;
  const target = await resolveQualificationTarget(
    options.firstSelection,
    options.packagesRepository,
    options.matrix,
  );
  const attemptDirectory = path.join(
    options.stateDirectory,
    `preflight-${randomUUID().replaceAll('-', '')}`,
  );

  try {
    const candidate = await prepareCandidateClosure({
      adapterPackage: target.adapter.implementation.package,
      attemptDirectory,
      ...(target.profile.runtimePackages === undefined
        ? {}
        : { runtimePackages: target.profile.runtimePackages }),
    });
    const baseline = await inspectQualificationBaseline({
      candidate,
      customTargetDigest: options.customTargetDigest,
      executionEnvironment: options.executionEnvironment,
      isDryRun: false,
      qualificationBaselineDigest: options.customInputState.qualificationBaselineDigest,
      resultsRoot: options.resultsRoot,
      selection: options.firstSelection,
      skillState: options.customInputState.skillState,
    });
    if (!baseline.passed) {
      throw new Error(
        `Adapter qualification requires an exact passing Custom baseline: ${baseline.failures.join(' ')}`,
      );
    }
  } finally {
    await rm(attemptDirectory, { force: true, recursive: true });
  }
};

/** Runs or resumes one bounded adapter-profile batch with isolated target evidence. */
export const runQualificationProfileBatch = async (options: {
  host: ICodexHost;
  selector: IQualificationProfileBatchSelectorInput;
  packagesRepository?: string;
  skillRepository?: string;
  resultsRoot?: string;
  checkpointPath?: string;
  ledgerPath?: string;
  historyRoot?: string;
  isDryRun?: boolean;
  reuseEvidence?: boolean;
  restart?: boolean;
  resumeStoppedStage?: boolean;
  workerCount?: IEvaluationBatchWorkerCount;
  requestPaidExecutionApproval?: (request: IQualificationPaidExecutionRequest) => Promise<boolean>;
  onProgress?: (progress: IQualificationProgress) => Promise<void> | void;
  operationalRetry?: IQualificationOperationalRetryOptions;
  signal?: AbortSignal;
}): Promise<IQualificationProfileBatchOutcome> => {
  const packagesRepository = path.resolve(
    options.packagesRepository ?? DEFAULT_PACKAGES_REPOSITORY,
  );
  const skillRepository = path.resolve(options.skillRepository ?? DEFAULT_SKILL_REPOSITORY);
  const resultsRoot = options.resultsRoot ?? QUALIFICATION_RESULTS_ROOT;
  const checkpointPath = options.checkpointPath ?? QUALIFICATION_PROFILE_BATCH_CHECKPOINT_PATH;
  const ledgerPath = options.ledgerPath ?? QUALIFICATION_PROFILE_BATCH_LEDGER_PATH;
  const historyRoot = options.historyRoot ?? QUALIFICATION_PROFILE_BATCH_HISTORY_ROOT;
  const isDryRun = options.isDryRun ?? false;
  const reuseEvidence = options.reuseEvidence ?? true;
  const workerCount = options.workerCount ?? EVALUATION_BATCH_DEFAULT_WORKER_COUNT;
  const selector = await resolveProfileSelector({ historyRoot, input: options.selector });
  const compatibilitySnapshot = await loadRuntimeCompatibilitySnapshot(packagesRepository);
  const customTarget = await resolveQualificationTarget(
    { adapterId: 'custom', implementationId: 'custom' },
    packagesRepository,
    compatibilitySnapshot.matrix,
  );
  const [customInputState, executionEnvironment, profileIndexDigest] = await Promise.all([
    inspectQualificationInputState(
      compatibilitySnapshot.repositoryState,
      skillRepository,
      customTarget,
    ),
    inspectQualificationExecutionEnvironment(options.host),
    calculateDirectoryFingerprint(QUALIFICATION_PROFILES_ROOT),
  ]);
  const identityState = {
    executionEnvironment,
    isDryRun,
    packagesRepository,
    packagesRepositoryCommit: customInputState.packagesState.commit,
    packagesRepositoryFingerprint: customInputState.packagesState.fingerprint,
    profileIndexDigest,
    qualificationDigest: customInputState.qualificationDigest,
    reuseEvidence,
    selector,
    skillDigest: customInputState.skillState.fingerprint,
    skillRepository,
  };
  const identitySha256 = createBatchIdentity(identityState);
  await assertQualificationBatchDiskAdmission(workerCount, skillRepository);
  const firstTargetId = selector.targetIds[0];
  if (firstTargetId === undefined) throw new Error('Qualification profile batch has no target.');
  await assertExactCustomBaseline({
    customInputState,
    customTargetDigest: customTarget.targetDigest,
    executionEnvironment,
    firstSelection: parseTargetId(firstTargetId),
    isDryRun,
    matrix: compatibilitySnapshot.matrix,
    packagesRepository,
    resultsRoot,
    stateDirectory: path.dirname(checkpointPath),
  });
  let checkpoint = await readQualificationProfileBatchState(
    checkpointPath,
    QualificationProfileBatchCheckpointSchema,
  );
  let ledger = await readQualificationProfileBatchState(
    ledgerPath,
    QualificationProfileBatchLedgerSchema,
  );

  if (options.restart === true && (checkpoint !== null || ledger !== null)) {
    if (checkpoint === null || ledger === null) {
      throw new Error('Qualification profile-batch restart requires complete matching state.');
    }
    validateBatchState({ checkpoint, identitySha256, ledger, selector });
    await Promise.all(
      Object.values(checkpoint.attemptIds).map((attemptId) =>
        rm(getLocalAttemptDirectory(attemptId), { force: true, recursive: true }),
      ),
    );
    await Promise.all([rm(checkpointPath, { force: true }), rm(ledgerPath, { force: true })]);
    checkpoint = null;
    ledger = null;
  }

  if (checkpoint === null && ledger === null) {
    const batchId = `b-${randomUUID().replaceAll('-', '')}`;
    const timestamp = new Date().toISOString();
    const attemptIds = Object.fromEntries(
      selector.targetIds.map((targetId) => [targetId, createAttemptId(parseTargetId(targetId))]),
    );
    checkpoint = QualificationProfileBatchCheckpointSchema.parse({
      schemaVersion: QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
      batchId,
      identitySha256,
      ...identityState,
      attemptIds,
      stop: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    ledger = QualificationProfileBatchLedgerSchema.parse({
      schemaVersion: QUALIFICATION_PROFILE_BATCH_SCHEMA_VERSION,
      batchId,
      identitySha256,
      selector,
      isDryRun,
      records: [],
      candidateTokensConsumed: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await writeQualificationProfileBatchState(checkpointPath, checkpoint);
    await writeQualificationProfileBatchState(ledgerPath, ledger);
  }
  if (checkpoint === null || ledger === null) {
    throw new Error(
      'Qualification profile-batch state is incomplete. Use --restart after inspection.',
    );
  }
  validateBatchState({ checkpoint, identitySha256, ledger, selector });
  if (
    checkpoint.stop !== null &&
    checkpoint.stop.kind !== 'candidate-token-limit' &&
    checkpoint.stop.kind !== 'temporary-storage-limit'
  ) {
    throw new Error(
      `Qualification profile batch stopped at ${checkpoint.stop.targetId}: ${checkpoint.stop.kind}. Use --restart after correcting the cause.`,
    );
  }

  let activeCheckpoint: IQualificationProfileBatchCheckpoint = checkpoint;
  let activeLedger: IQualificationProfileBatchLedger = ledger;
  const remainingTargetIds = selector.targetIds.slice(activeLedger.records.length);
  const stoppedAttempts: Array<{ attemptId: string; targetId: string }> = [];
  for (const targetId of remainingTargetIds) {
    const attemptId = activeCheckpoint.attemptIds[targetId];
    if (attemptId === undefined) throw new Error(`Target ${targetId} has no mapped attempt.`);
    const attemptCheckpoint = await getAttemptCheckpoint(attemptId);
    if (attemptCheckpoint === null) continue;
    assertMappedAttempt({
      attempt: attemptCheckpoint,
      isDryRun,
      selection: parseTargetId(targetId),
    });
    if (Object.values(attemptCheckpoint.stages).some(({ status }) => status === 'stopped')) {
      stoppedAttempts.push({ attemptId, targetId });
    }
  }
  if (options.resumeStoppedStage === true && stoppedAttempts.length !== 1) {
    throw new Error('--resume-stopped-stage requires exactly one stopped profile stage.');
  }
  if (options.resumeStoppedStage !== true && stoppedAttempts.length > 0) {
    throw new Error(
      'Qualification profile batch contains a stopped stage. Resume with --resume-stopped-stage.',
    );
  }
  const stoppedAttemptId =
    options.resumeStoppedStage === true ? stoppedAttempts[0]?.attemptId : null;
  activeCheckpoint = QualificationProfileBatchCheckpointSchema.parse({
    ...activeCheckpoint,
    stop: null,
    updatedAt: new Date().toISOString(),
  });
  await writeQualificationProfileBatchState(checkpointPath, activeCheckpoint);
  const tokenController = createQualificationBatchTokenController({
    workerCount,
    totalTokenLimit: null,
  });
  const remainingTargets = await Promise.all(
    remainingTargetIds.map((targetId) =>
      resolveQualificationTarget(
        parseTargetId(targetId),
        packagesRepository,
        compatibilitySnapshot.matrix,
      ),
    ),
  );
  const directCaseCount = remainingTargets.reduce(
    (caseCount, target) => caseCount + target.profile.cases.length,
    0,
  );
  const plannedCallCount = getQualificationPlannedCallCount(directCaseCount);
  const requestPaidExecutionApproval = coalesceQualificationPaidExecutionApproval(
    options.requestPaidExecutionApproval,
    {
      actorReasoningEffort: executionEnvironment.actorReasoningEffort,
      candidateCount: selector.targetIds.length,
      candidateTokensConsumed: await getProfileBatchCandidateTokenCount({
        checkpoint: activeCheckpoint,
        ledger: activeLedger,
      }),
      directCaseCount,
      judgeReasoningEffort: executionEnvironment.judgeReasoningEffort,
      maximumCallCount: getQualificationMaximumCallCount(plannedCallCount),
      maximumTokenCount: selector.targetIds.length * QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
      maximumTokensPerCall: getQualificationMaximumTokenCount(1),
      model: executionEnvironment.model,
      plannedCallCount,
      reusedCaseCount: 0,
    },
  );

  const executeTarget = async (targetId: string) => {
    const selection = parseTargetId(targetId);
    const attemptId = activeCheckpoint.attemptIds[targetId];
    if (attemptId === undefined) throw new Error(`Target ${targetId} has no mapped attempt.`);
    const attemptDirectory = getLocalAttemptDirectory(attemptId);
    const existingCheckpoint = await getAttemptCheckpoint(attemptId);
    if (existingCheckpoint !== null) {
      assertMappedAttempt({ attempt: existingCheckpoint, isDryRun, selection });
      if (existingCheckpoint.status === 'passed' || existingCheckpoint.status === 'failed') {
        return {
          attemptDirectory,
          result: await readJsonFile(
            path.join(attemptDirectory, 'result-draft.json'),
            QualificationAttemptResultDraftSchema,
          ),
        };
      }
    }
    const sharedOptions = {
      host: options.host,
      tokenController,
      workerCount: 1 as const,
      ...(requestPaidExecutionApproval === undefined ? {} : { requestPaidExecutionApproval }),
      ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
      ...(options.operationalRetry === undefined
        ? {}
        : { operationalRetry: options.operationalRetry }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    };
    const outcome = await runQualification(
      existingCheckpoint === null
        ? {
            ...sharedOptions,
            selection,
            newAttemptId: attemptId,
            packagesRepository,
            skillRepository,
            resultsRoot,
            isDryRun,
            mode: isDryRun ? ('dry-run' as const) : ('official' as const),
            reuseEvidence,
          }
        : {
            ...sharedOptions,
            resumeAttemptId: attemptId,
            resumeStoppedStage: stoppedAttemptId === attemptId,
            resultsRoot,
          },
    );
    const attemptCheckpoint = await readAttemptCheckpoint(outcome.attemptDirectory);
    assertQualificationProfileWorkerResult(
      attemptId,
      targetId,
      outcome.result,
      attemptCheckpoint.stages,
    );
    return outcome;
  };

  const batchFailure: { stop: QualificationProfileWorkerStopError | null } = { stop: null };
  try {
    await runOrderedEvaluationBatch({
      items: remainingTargetIds,
      workerCount,
      executeItem: ({ item }) => executeTarget(item),
      commitItem: async ({ item: targetId, value: outcome }) => {
        const attemptCheckpoint = await readAttemptCheckpoint(outcome.attemptDirectory);
        const record = createRecord(outcome.result, attemptCheckpoint.candidateTokensConsumed);
        activeLedger = QualificationProfileBatchLedgerSchema.parse({
          ...activeLedger,
          records: [...activeLedger.records, record],
          candidateTokensConsumed:
            activeLedger.candidateTokensConsumed + attemptCheckpoint.candidateTokensConsumed,
          updatedAt: new Date().toISOString(),
        });
        await writeQualificationProfileBatchState(ledgerPath, activeLedger);
        await rm(outcome.attemptDirectory, { force: true, recursive: true });
        if (targetId !== createTargetId(record)) {
          throw new Error('Qualification profile-batch commit order changed unexpectedly.');
        }
      },
      onItemError: async ({ error, item: targetId }) => {
        const attemptId = activeCheckpoint.attemptIds[targetId];
        if (attemptId === undefined) throw new Error(`Target ${targetId} has no mapped attempt.`);
        batchFailure.stop =
          error instanceof QualificationProfileWorkerStopError
            ? error
            : new QualificationProfileWorkerStopError(
                attemptId,
                targetId,
                'execution-error',
                error instanceof Error ? error.message : 'Unknown profile worker failure.',
              );
        const stop = batchFailure.stop;
        activeCheckpoint = QualificationProfileBatchCheckpointSchema.parse({
          ...activeCheckpoint,
          stop:
            stop.kind === 'operational-stop'
              ? null
              : {
                  kind: stop.kind,
                  targetId: stop.targetId,
                  attemptId: stop.attemptId,
                  stoppedAt: new Date().toISOString(),
                },
          updatedAt: new Date().toISOString(),
        });
        await writeQualificationProfileBatchState(checkpointPath, activeCheckpoint);
      },
    });
  } catch (error) {
    const stop = batchFailure.stop;
    if (stop === null || stop.kind === 'execution-error') throw error;
    const outcome = await createOutcome({ checkpoint: activeCheckpoint, ledger: activeLedger });
    assertQualificationProfileBatchOutputSize(outcome);
    return outcome;
  }

  await writeQualificationProfileBatchState(
    getHistoryPath(historyRoot, activeLedger.batchId),
    activeLedger,
  );
  await Promise.all([rm(checkpointPath, { force: true }), rm(ledgerPath, { force: true })]);
  const outcome = await createOutcome({ checkpoint: null, ledger: activeLedger });
  assertQualificationProfileBatchOutputSize(outcome);
  return outcome;
};
