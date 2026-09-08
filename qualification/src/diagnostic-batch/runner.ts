import { randomUUID } from 'node:crypto';
import { access, lstat, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import type { IBoundarySchema } from '../filesystem/index.ts';
import {
  DEFAULT_PACKAGES_REPOSITORY,
  DEFAULT_SKILL_REPOSITORY,
  QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
  QUALIFICATION_RESULTS_ROOT,
} from '../constants/index.ts';
import {
  QualificationAttemptResultDraftSchema,
  QualificationAttemptResultSchema,
  QualificationProbesSchema,
  type IQualificationAttemptResult,
  type IQualificationSelection,
} from '../contracts/index.ts';
import {
  getLocalAttemptDirectory,
  getQualificationModelUsageTokenCount,
  getQualificationMaximumTokenCount,
  inspectQualificationExecutionEnvironment,
  inspectQualificationInputState,
  runQualification,
  type IQualificationOperationalRetryOptions,
  type IQualificationPaidExecutionRequest,
  type IQualificationProgress,
} from '../execution/index.ts';
import {
  calculateSha256,
  readJsonFile,
  readYamlFile,
  resolveContainedPath,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import {
  loadRuntimeCompatibilitySnapshot,
  resolveQualificationTarget,
  type IResolvedQualificationTarget,
} from '../compatibility/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import { readAttemptCheckpoint } from '../checkpoint/index.ts';
import { resolveQualificationResultTargetDirectory } from '../storage/index.ts';
import {
  QUALIFICATION_DIAGNOSTIC_CHECKPOINT_PATH,
  QUALIFICATION_DIAGNOSTIC_EXPLANATION_MAXIMUM_BYTE_COUNT,
  QUALIFICATION_DIAGNOSTIC_LEDGER_PATH,
  QUALIFICATION_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT,
  QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION,
  QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT,
} from './constants.ts';
import {
  QualificationDiagnosticCheckpointSchema,
  QualificationDiagnosticLedgerSchema,
  QualificationDiagnosticRecordSchema,
  QualificationDiagnosticSelectorSchema,
  type IQualificationDiagnosticBatchOutcome,
  type IQualificationDiagnosticCheckpoint,
  type IQualificationDiagnosticLedger,
  type IQualificationDiagnosticRecord,
  type IQualificationDiagnosticSelector,
  type IQualificationDiagnosticSelectorInput,
} from './types.ts';

const hasPath = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const parseSelectorValues = (value: string | null, optionName: string): string[] => {
  if (value === null) {
    throw new Error(`${optionName} requires one comma-separated value.`);
  }

  const values = value.split(',').map((entry) => entry.trim());

  if (values.some((entry) => entry.length === 0) || new Set(values).size !== values.length) {
    throw new Error(`${optionName} requires unique non-empty comma-separated values.`);
  }

  return values;
};

const readUnresolvedAttempt = async (options: {
  attemptId: string;
  resultsRoot: string;
  selection: IQualificationSelection;
}): Promise<IQualificationAttemptResult> => {
  const localResultPath = path.join(
    getLocalAttemptDirectory(options.attemptId),
    'result-draft.json',
  );

  if (await hasPath(localResultPath)) {
    return readJsonFile(localResultPath, QualificationAttemptResultDraftSchema);
  }

  const targetDirectory = await resolveQualificationResultTargetDirectory(
    options.resultsRoot,
    options.selection,
  );
  const attemptsDirectory = path.join(targetDirectory, 'attempts');
  let entries;

  try {
    entries = await readdir(attemptsDirectory, { withFileTypes: true });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Qualification attempt ${options.attemptId} was not found.`, {
        cause: error,
      });
    }
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const resultPath = path.join(attemptsDirectory, entry.name, 'attempt.json');

    try {
      const result = await readJsonFile(resultPath, QualificationAttemptResultSchema);
      if (result.attemptId === options.attemptId) {
        return result;
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Qualification attempt ${options.attemptId} was not found.`);
};

const resolveDiagnosticSelector = async (options: {
  input: IQualificationDiagnosticSelectorInput;
  resultsRoot: string;
  target: IResolvedQualificationTarget;
}): Promise<IQualificationDiagnosticSelector> => {
  const profileCaseIds = options.target.profile.cases.map(({ id }) => id);
  let caseIds: string[];

  if (options.input.kind === 'all') {
    if (options.input.value !== null) {
      throw new Error('--all does not accept a value.');
    }
    caseIds = profileCaseIds;
  } else if (options.input.kind === 'cases') {
    const requestedCaseIds = parseSelectorValues(options.input.value, '--cases');
    const unknownCaseIds = requestedCaseIds.filter((caseId) => !profileCaseIds.includes(caseId));
    if (unknownCaseIds.length > 0) {
      throw new Error(`Unknown qualification cases: ${unknownCaseIds.join(', ')}.`);
    }
    caseIds = profileCaseIds.filter((caseId) => requestedCaseIds.includes(caseId));
  } else if (options.input.kind === 'claims') {
    const requestedClaimIds = parseSelectorValues(options.input.value, '--claims');
    const probes = await readYamlFile(
      resolveContainedPath(options.target.profileDirectory, options.target.profile.probesFile),
      QualificationProbesSchema,
    );
    if (
      probes.adapterId !== options.target.selection.adapterId ||
      probes.implementationId !== options.target.selection.implementationId
    ) {
      throw new Error('Qualification probes do not match the selected target.');
    }
    const probesById = new Map(probes.probes.map((probe) => [probe.id, probe]));
    const unknownClaimIds = requestedClaimIds.filter((claimId) => !probesById.has(claimId));
    if (unknownClaimIds.length > 0) {
      throw new Error(`Unknown qualification claims: ${unknownClaimIds.join(', ')}.`);
    }
    const coveredCaseIds = new Set(
      requestedClaimIds.flatMap((claimId) => probesById.get(claimId)?.coveredBy ?? []),
    );
    caseIds = profileCaseIds.filter((caseId) => coveredCaseIds.has(caseId));
    if (caseIds.length === 0) {
      throw new Error('Selected claims are covered only by shared Custom evidence.');
    }
  } else {
    const [attemptId] = parseSelectorValues(options.input.value, '--unresolved-from');
    if (attemptId === undefined || options.input.value?.includes(',')) {
      throw new Error('--unresolved-from requires exactly one attempt id.');
    }
    const result = await readUnresolvedAttempt({
      attemptId,
      resultsRoot: options.resultsRoot,
      selection: options.target.selection,
    });
    if (
      result.selection.adapterId !== options.target.selection.adapterId ||
      result.selection.implementationId !== options.target.selection.implementationId
    ) {
      throw new Error('Unresolved qualification attempt does not match the selected target.');
    }
    const resolvedCaseIds = new Set(
      result.cases
        .filter(({ status }) => status === 'passed' || status === 'recovered')
        .map(({ caseId }) => caseId),
    );
    caseIds = profileCaseIds.filter((caseId) => !resolvedCaseIds.has(caseId));
    if (caseIds.length === 0) {
      throw new Error(`Qualification attempt ${attemptId} has no unresolved cases.`);
    }
  }

  return QualificationDiagnosticSelectorSchema.parse({
    kind: options.input.kind,
    value: options.input.value,
    caseIds,
  });
};

const createBatchIdentity = (options: {
  checkpoint: Omit<
    IQualificationDiagnosticCheckpoint,
    | 'activeAttemptId'
    | 'candidateTokensConsumed'
    | 'createdAt'
    | 'identitySha256'
    | 'nextCaseIndex'
    | 'schemaVersion'
    | 'stop'
    | 'updatedAt'
  >;
}): string => calculateSha256(`${JSON.stringify(options.checkpoint)}\n`);

/** Reads one diagnostic file only after enforcing its regular-file and byte boundaries. */
export const readQualificationDiagnosticState = async <TResult>(
  filePath: string,
  schema: IBoundarySchema<TResult>,
): Promise<TResult | null> => {
  if (!(await hasPath(filePath))) {
    return null;
  }
  const fileStats = await lstat(filePath);
  if (!fileStats.isFile() || fileStats.size > QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT) {
    throw new Error('Qualification diagnostic state is not one bounded regular file.');
  }
  const content = await readFile(filePath);
  if (content.byteLength > QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT) {
    throw new Error('Qualification diagnostic state exceeds its UTF-8 byte limit.');
  }
  return schema.parse(JSON.parse(content.toString('utf8')) as unknown);
};

/** Atomically replaces one diagnostic file when its encoded state fits the fixed boundary. */
export const writeQualificationDiagnosticState = async (
  filePath: string,
  state: unknown,
): Promise<void> => {
  const content = `${JSON.stringify(state, null, 2)}\n`;
  if (Buffer.byteLength(content, 'utf8') > QUALIFICATION_DIAGNOSTIC_STATE_MAXIMUM_BYTE_COUNT) {
    throw new Error('Qualification diagnostic state exceeds its UTF-8 byte limit.');
  }
  await writeTextFileAtomically(filePath, content);
};

const validateBatchState = (options: {
  checkpoint: IQualificationDiagnosticCheckpoint | null;
  identitySha256: string;
  ledger: IQualificationDiagnosticLedger;
  selection: IQualificationSelection;
  selector: IQualificationDiagnosticSelector;
}): void => {
  const { checkpoint, identitySha256, ledger, selection, selector } = options;
  if (
    ledger.identitySha256 !== identitySha256 ||
    JSON.stringify(ledger.selection) !== JSON.stringify(selection) ||
    JSON.stringify(ledger.selector) !== JSON.stringify(selector) ||
    ledger.records.some((record, index) => record.caseId !== selector.caseIds[index]) ||
    ledger.records.length > selector.caseIds.length ||
    ledger.candidateTokensConsumed !== (ledger.records.at(-1)?.candidateTokensConsumed ?? 0)
  ) {
    throw new Error('Qualification diagnostic ledger does not match the current batch identity.');
  }
  if (checkpoint === null) {
    if (ledger.records.length !== selector.caseIds.length) {
      throw new Error('Incomplete qualification diagnostic ledger has no private checkpoint.');
    }
    return;
  }
  const hasCommittedRecordOverlap =
    checkpoint.activeAttemptId !== null &&
    checkpoint.nextCaseIndex + 1 === ledger.records.length &&
    ledger.records.at(-1)?.attemptId === checkpoint.activeAttemptId &&
    ledger.records.at(-1)?.caseId === selector.caseIds[checkpoint.nextCaseIndex];
  const checkpointIdentitySha256 = createBatchIdentity({
    checkpoint: {
      selection: checkpoint.selection,
      selector: checkpoint.selector,
      packagesRepository: checkpoint.packagesRepository,
      skillRepository: checkpoint.skillRepository,
      profileDigest: checkpoint.profileDigest,
      qualificationDigest: checkpoint.qualificationDigest,
      skillDigest: checkpoint.skillDigest,
      packagesRepositoryCommit: checkpoint.packagesRepositoryCommit,
      packagesRepositoryFingerprint: checkpoint.packagesRepositoryFingerprint,
      targetDigest: checkpoint.targetDigest,
      executionEnvironment: checkpoint.executionEnvironment,
    },
  });
  if (
    checkpoint.identitySha256 !== identitySha256 ||
    checkpointIdentitySha256 !== identitySha256 ||
    JSON.stringify(checkpoint.selection) !== JSON.stringify(ledger.selection) ||
    JSON.stringify(checkpoint.selector) !== JSON.stringify(selector) ||
    (checkpoint.nextCaseIndex !== ledger.records.length && !hasCommittedRecordOverlap) ||
    checkpoint.nextCaseIndex >= selector.caseIds.length ||
    (checkpoint.activeAttemptId === null
      ? checkpoint.candidateTokensConsumed !== ledger.candidateTokensConsumed
      : checkpoint.candidateTokensConsumed < ledger.candidateTokensConsumed) ||
    (checkpoint.stop !== null && checkpoint.activeAttemptId !== checkpoint.stop.attemptId)
  ) {
    throw new Error(
      'Qualification diagnostic checkpoint does not match the current batch identity.',
    );
  }
};

const createDiagnosticRecord = (
  result: IQualificationAttemptResult,
  candidateTokensConsumed: number,
): IQualificationDiagnosticRecord => {
  const caseResult = result.cases[0];
  if (result.mode !== 'diagnostic' || result.cases.length !== 1 || caseResult === undefined) {
    throw new Error('Completed diagnostic attempt must contain exactly one diagnostic case.');
  }
  const terminalTrial = caseResult.trials.at(-1);
  const failedRequirementIds = [
    ...new Set(
      terminalTrial?.requirementAssessments
        .filter(({ verdict }) => verdict === 'fail')
        .map(({ id }) => id) ?? [],
    ),
  ].sort();
  const unevaluatedRequirementIds = [
    ...new Set(
      terminalTrial?.requirementAssessments
        .filter(({ verdict }) => verdict === 'not-evaluated')
        .map(({ id }) => id) ?? [],
    ),
  ].sort();
  const modelTokenCount = caseResult.trials.reduce(
    (total, trial) =>
      total +
      (trial.actorUsage === null ? 0 : getQualificationModelUsageTokenCount(trial.actorUsage)) +
      (trial.judgeUsage === null ? 0 : getQualificationModelUsageTokenCount(trial.judgeUsage)),
    0,
  );
  const modelCallCount = caseResult.trials.reduce(
    (total, trial) => total + 1 + (trial.judgeStatus === 'completed' ? 1 : 0),
    0,
  );
  const operationalFailureCount = result.stages.reduce(
    (total, stage) => total + stage.operationalRetries.length + stage.operationalStops.length,
    0,
  );
  const explanation =
    caseResult.status === 'failed'
      ? `The initial trial failed with ${failedRequirementIds.length} failed and ${unevaluatedRequirementIds.length} unevaluated requirement(s).`
      : 'The initial trial passed every evaluated requirement.';

  if (
    Buffer.byteLength(explanation, 'utf8') > QUALIFICATION_DIAGNOSTIC_EXPLANATION_MAXIMUM_BYTE_COUNT
  ) {
    throw new Error('Qualification diagnostic explanation exceeds its UTF-8 byte limit.');
  }

  return QualificationDiagnosticRecordSchema.parse({
    schemaVersion: QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION,
    attemptId: result.attemptId,
    caseId: caseResult.caseId,
    verdict: caseResult.status === 'failed' ? 'failed' : 'passed',
    explanation,
    failedRequirementIds,
    unevaluatedRequirementIds,
    durationMs: caseResult.durationMs,
    modelCallCount,
    modelTokenCount,
    operationalFailureCount,
    candidateTokensConsumed,
  });
};

const createOutcome = (options: {
  checkpoint: IQualificationDiagnosticCheckpoint | null;
  ledger: IQualificationDiagnosticLedger;
}): IQualificationDiagnosticBatchOutcome => ({
  status: options.checkpoint === null ? 'completed' : 'incomplete',
  identitySha256: options.ledger.identitySha256,
  selection: options.ledger.selection,
  selector: options.ledger.selector,
  candidateTokenLimit: QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
  candidateTokensConsumed:
    options.checkpoint?.candidateTokensConsumed ?? options.ledger.candidateTokensConsumed,
  activeAttemptId: options.checkpoint?.activeAttemptId ?? null,
  records: options.ledger.records,
});

/** Rejects any final diagnostic output that would exceed its independent stdout boundary. */
export const assertQualificationDiagnosticOutputSize = (
  outcome: IQualificationDiagnosticBatchOutcome,
): void => {
  if (
    Buffer.byteLength(`${JSON.stringify(outcome, null, 2)}\n`, 'utf8') >
    QUALIFICATION_DIAGNOSTIC_OUTPUT_MAXIMUM_BYTE_COUNT
  ) {
    throw new Error('Qualification diagnostic output exceeds its UTF-8 byte limit.');
  }
};

const createAttemptId = (selection: IQualificationSelection): string => {
  const timestamp = new Date().toISOString().replace(/[-:.]/gu, '');
  return `${timestamp}-${selection.adapterId}-${selection.implementationId}-${randomUUID().slice(0, 8)}`;
};

/** Runs one exact sequential diagnostic selection without mutating official evidence. */
export const runQualificationDiagnosticBatch = async (options: {
  host: ICodexHost;
  selection: IQualificationSelection;
  selector: IQualificationDiagnosticSelectorInput;
  packagesRepository?: string;
  skillRepository?: string;
  resultsRoot?: string;
  checkpointPath?: string;
  ledgerPath?: string;
  restart?: boolean;
  resumeStoppedStage?: boolean;
  requestPaidExecutionApproval?: (request: IQualificationPaidExecutionRequest) => Promise<boolean>;
  onProgress?: (progress: IQualificationProgress) => Promise<void> | void;
  operationalRetry?: IQualificationOperationalRetryOptions;
  signal?: AbortSignal;
}): Promise<IQualificationDiagnosticBatchOutcome> => {
  const packagesRepository = path.resolve(
    options.packagesRepository ?? DEFAULT_PACKAGES_REPOSITORY,
  );
  const skillRepository = path.resolve(options.skillRepository ?? DEFAULT_SKILL_REPOSITORY);
  const resultsRoot = options.resultsRoot ?? QUALIFICATION_RESULTS_ROOT;
  const checkpointPath = options.checkpointPath ?? QUALIFICATION_DIAGNOSTIC_CHECKPOINT_PATH;
  const ledgerPath = options.ledgerPath ?? QUALIFICATION_DIAGNOSTIC_LEDGER_PATH;
  const compatibilitySnapshot = await loadRuntimeCompatibilitySnapshot(packagesRepository);
  const target = await resolveQualificationTarget(
    options.selection,
    packagesRepository,
    compatibilitySnapshot.matrix,
  );
  const selector = await resolveDiagnosticSelector({
    input: options.selector,
    resultsRoot,
    target,
  });
  const inputState = await inspectQualificationInputState(
    compatibilitySnapshot.repositoryState,
    skillRepository,
    target,
  );
  const executionEnvironment = await inspectQualificationExecutionEnvironment(options.host);
  const identityState = {
    selection: target.selection,
    selector,
    packagesRepository,
    skillRepository,
    profileDigest: target.profileDigest,
    qualificationDigest: inputState.qualificationDigest,
    skillDigest: inputState.skillState.fingerprint,
    packagesRepositoryCommit: inputState.packagesState.commit,
    packagesRepositoryFingerprint: inputState.packagesState.fingerprint,
    targetDigest: target.targetDigest,
    executionEnvironment,
  };
  const identitySha256 = createBatchIdentity({ checkpoint: identityState });
  let checkpoint = await readQualificationDiagnosticState(
    checkpointPath,
    QualificationDiagnosticCheckpointSchema,
  );
  let ledger = await readQualificationDiagnosticState(
    ledgerPath,
    QualificationDiagnosticLedgerSchema,
  );

  if (options.restart === true && (checkpoint !== null || ledger !== null)) {
    if (ledger === null) {
      throw new Error('Qualification diagnostic restart requires a valid matching ledger.');
    }
    validateBatchState({
      checkpoint,
      identitySha256,
      ledger,
      selection: target.selection,
      selector,
    });
    if (checkpoint?.activeAttemptId !== null && checkpoint?.activeAttemptId !== undefined) {
      await rm(getLocalAttemptDirectory(checkpoint.activeAttemptId), {
        force: true,
        recursive: true,
      });
    }
    await Promise.all([rm(checkpointPath, { force: true }), rm(ledgerPath, { force: true })]);
    checkpoint = null;
    ledger = null;
  }

  if (checkpoint === null && ledger === null) {
    const timestamp = new Date().toISOString();
    checkpoint = QualificationDiagnosticCheckpointSchema.parse({
      schemaVersion: QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION,
      identitySha256,
      ...identityState,
      nextCaseIndex: 0,
      activeAttemptId: null,
      candidateTokensConsumed: 0,
      stop: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    ledger = QualificationDiagnosticLedgerSchema.parse({
      schemaVersion: QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION,
      identitySha256,
      selection: target.selection,
      selector,
      candidateTokensConsumed: 0,
      records: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    await writeQualificationDiagnosticState(checkpointPath, checkpoint);
    await writeQualificationDiagnosticState(ledgerPath, ledger);
  } else if (checkpoint !== null && ledger === null && checkpoint.nextCaseIndex === 0) {
    ledger = QualificationDiagnosticLedgerSchema.parse({
      schemaVersion: QUALIFICATION_DIAGNOSTIC_SCHEMA_VERSION,
      identitySha256,
      selection: target.selection,
      selector,
      candidateTokensConsumed: 0,
      records: [],
      createdAt: checkpoint.createdAt,
      updatedAt: checkpoint.createdAt,
    });
    await writeQualificationDiagnosticState(ledgerPath, ledger);
  }

  if (ledger === null) {
    throw new Error('Qualification diagnostic state has no completed-case ledger.');
  }
  validateBatchState({
    checkpoint,
    identitySha256,
    ledger,
    selection: target.selection,
    selector,
  });

  if (
    checkpoint !== null &&
    checkpoint.activeAttemptId !== null &&
    checkpoint.nextCaseIndex + 1 === ledger.records.length &&
    ledger.records.at(-1)?.attemptId === checkpoint.activeAttemptId
  ) {
    await rm(getLocalAttemptDirectory(checkpoint.activeAttemptId), {
      force: true,
      recursive: true,
    });
    const updatedAt = new Date().toISOString();
    const nextCaseIndex = checkpoint.nextCaseIndex + 1;
    if (nextCaseIndex === selector.caseIds.length) {
      await rm(checkpointPath, { force: true });
      checkpoint = null;
    } else {
      checkpoint = QualificationDiagnosticCheckpointSchema.parse({
        ...checkpoint,
        nextCaseIndex,
        activeAttemptId: null,
        candidateTokensConsumed: ledger.candidateTokensConsumed,
        updatedAt,
      });
      await writeQualificationDiagnosticState(checkpointPath, checkpoint);
    }
  }

  if (checkpoint === null) {
    if (options.resumeStoppedStage === true) {
      throw new Error('--resume-stopped-stage requires one stopped diagnostic stage.');
    }
    const outcome = createOutcome({ checkpoint, ledger });
    assertQualificationDiagnosticOutputSize(outcome);
    return outcome;
  }
  if (checkpoint.stop !== null) {
    throw new Error(
      `Qualification diagnostic batch stopped at ${checkpoint.stop.caseId}: ${checkpoint.stop.kind}. Use --restart after correcting the cause.`,
    );
  }

  let canResumeStoppedStage = options.resumeStoppedStage === true;

  while (checkpoint.nextCaseIndex < selector.caseIds.length) {
    const caseId = selector.caseIds[checkpoint.nextCaseIndex];
    if (caseId === undefined) {
      throw new Error('Qualification diagnostic selection ended unexpectedly.');
    }
    let attemptId = checkpoint.activeAttemptId;
    let isResume = attemptId !== null;
    if (attemptId === null) {
      if (canResumeStoppedStage) {
        throw new Error('--resume-stopped-stage requires one stopped diagnostic stage.');
      }
      attemptId = createAttemptId(target.selection);
      checkpoint = QualificationDiagnosticCheckpointSchema.parse({
        ...checkpoint,
        activeAttemptId: attemptId,
        updatedAt: new Date().toISOString(),
      });
      await writeQualificationDiagnosticState(checkpointPath, checkpoint);
    } else if (
      !(await hasPath(path.join(getLocalAttemptDirectory(attemptId), 'checkpoint.json')))
    ) {
      await rm(getLocalAttemptDirectory(attemptId), { force: true, recursive: true });
      isResume = false;
    }

    const outcome = await runQualification(
      isResume
        ? {
            host: options.host,
            resumeAttemptId: attemptId,
            resumeStoppedStage: canResumeStoppedStage,
            ...(options.requestPaidExecutionApproval === undefined
              ? {}
              : { requestPaidExecutionApproval: options.requestPaidExecutionApproval }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
            ...(options.operationalRetry === undefined
              ? {}
              : { operationalRetry: options.operationalRetry }),
            ...(options.signal === undefined ? {} : { signal: options.signal }),
          }
        : {
            host: options.host,
            selection: target.selection,
            caseId,
            mode: 'diagnostic',
            newAttemptId: attemptId,
            initialCandidateTokensConsumed: checkpoint.candidateTokensConsumed,
            packagesRepository,
            skillRepository,
            reuseEvidence: false,
            ...(options.requestPaidExecutionApproval === undefined
              ? {}
              : { requestPaidExecutionApproval: options.requestPaidExecutionApproval }),
            ...(options.onProgress === undefined ? {} : { onProgress: options.onProgress }),
            ...(options.operationalRetry === undefined
              ? {}
              : { operationalRetry: options.operationalRetry }),
            ...(options.signal === undefined ? {} : { signal: options.signal }),
          },
    );
    canResumeStoppedStage = false;
    const attemptCheckpoint = await readAttemptCheckpoint(outcome.attemptDirectory);
    checkpoint = QualificationDiagnosticCheckpointSchema.parse({
      ...checkpoint,
      candidateTokensConsumed: attemptCheckpoint.candidateTokensConsumed,
      updatedAt: new Date().toISOString(),
    });

    if (outcome.result.status === 'incomplete') {
      const stoppedStage = outcome.result.stages.find(({ status }) => status === 'stopped');
      const stopKind =
        stoppedStage?.hasUsedOperationalStopResume === true
          ? 'operational-recovery-exhausted'
          : stoppedStage === undefined &&
              checkpoint.candidateTokensConsumed + getQualificationMaximumTokenCount(1) >
                QUALIFICATION_CANDIDATE_TOKEN_LIMIT
            ? 'candidate-token-limit'
            : null;
      if (stopKind !== null) {
        checkpoint = QualificationDiagnosticCheckpointSchema.parse({
          ...checkpoint,
          stop: {
            kind: stopKind,
            caseId,
            attemptId,
            stoppedAt: new Date().toISOString(),
          },
        });
      }
      await writeQualificationDiagnosticState(checkpointPath, checkpoint);
      const incompleteOutcome = createOutcome({ checkpoint, ledger });
      assertQualificationDiagnosticOutputSize(incompleteOutcome);
      return incompleteOutcome;
    }
    const terminalCase = outcome.result.cases[0];
    if (
      outcome.result.status === 'errored' ||
      outcome.result.mode !== 'diagnostic' ||
      outcome.result.cases.length !== 1 ||
      terminalCase?.caseId !== caseId
    ) {
      checkpoint = QualificationDiagnosticCheckpointSchema.parse({
        ...checkpoint,
        stop: {
          kind: 'execution-error',
          caseId,
          attemptId,
          stoppedAt: new Date().toISOString(),
        },
      });
      await writeQualificationDiagnosticState(checkpointPath, checkpoint);
      throw new Error(
        `Qualification diagnostic case ${caseId} did not produce one matching terminal case in ${attemptId}.`,
      );
    }

    const record = createDiagnosticRecord(
      outcome.result,
      attemptCheckpoint.candidateTokensConsumed,
    );
    ledger = QualificationDiagnosticLedgerSchema.parse({
      ...ledger,
      candidateTokensConsumed: attemptCheckpoint.candidateTokensConsumed,
      records: [...ledger.records, record],
      updatedAt: new Date().toISOString(),
    });
    await writeQualificationDiagnosticState(ledgerPath, ledger);
    await rm(outcome.attemptDirectory, { force: true, recursive: true });
    const nextCaseIndex = checkpoint.nextCaseIndex + 1;
    if (nextCaseIndex === selector.caseIds.length) {
      await rm(checkpointPath, { force: true });
      checkpoint = null;
      break;
    }
    checkpoint = QualificationDiagnosticCheckpointSchema.parse({
      ...checkpoint,
      nextCaseIndex,
      activeAttemptId: null,
      candidateTokensConsumed: ledger.candidateTokensConsumed,
      updatedAt: new Date().toISOString(),
    });
    await writeQualificationDiagnosticState(checkpointPath, checkpoint);
  }

  const finalOutcome = createOutcome({ checkpoint, ledger });
  assertQualificationDiagnosticOutputSize(finalOutcome);
  return finalOutcome;
};
