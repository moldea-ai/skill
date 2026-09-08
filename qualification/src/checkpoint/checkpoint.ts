import path from 'node:path';

import {
  QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
} from '../constants/index.ts';
import {
  QualificationAttemptCheckpointSchema,
  QualificationStageCheckpointSchema,
  type IQualificationAttemptCheckpoint,
  type IQualificationExecutionEnvironment,
  type IQualificationOperationalRetry,
  type IQualificationOperationalStop,
  type IQualificationSelection,
  type IQualificationStageCheckpoint,
} from '../contracts/index.ts';
import { readJsonFile, writeJsonFileAtomically } from '../filesystem/index.ts';
import { writeQualificationStatusAttempt } from '../status/attempt-summary.ts';

/** Returns the canonical local checkpoint path for one attempt directory. */
export const getCheckpointPath = (attemptDirectory: string): string =>
  path.join(attemptDirectory, 'checkpoint.json');

/** Creates one pending stage state. */
export const createPendingStage = (stageId: string): IQualificationStageCheckpoint =>
  QualificationStageCheckpointSchema.parse({
    id: stageId,
    status: 'pending',
    startedAt: null,
    completedAt: null,
    durationMs: null,
    stageIdentity: null,
    reuseSourceAttemptId: null,
    error: null,
    hasUsedOperationalStopResume: false,
    operationalRetries: [],
    operationalStops: [],
  });

/** Appends one contiguous safe operational retry and persists it before backoff begins. */
export const appendQualificationOperationalRetry = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  retry: IQualificationOperationalRetry,
): Promise<IQualificationAttemptCheckpoint> => {
  const stage = checkpoint.stages[stageId];

  if (stage?.status !== 'running') {
    throw new Error(`Qualification stage ${stageId} is not running.`);
  }

  const updatedStage = QualificationStageCheckpointSchema.parse({
    ...stage,
    operationalRetries: [...stage.operationalRetries, retry],
  });
  const updatedCheckpoint = QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    stages: { ...checkpoint.stages, [stageId]: updatedStage },
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Persists a terminal operational stop before the exhausted stage returns control. */
export const appendQualificationOperationalStop = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageId: string,
  stop: IQualificationOperationalStop,
): Promise<IQualificationAttemptCheckpoint> => {
  const stage = checkpoint.stages[stageId];

  if (stage?.status !== 'running') {
    throw new Error(`Qualification stage ${stageId} is not running.`);
  }

  const updatedStage = QualificationStageCheckpointSchema.parse({
    ...stage,
    status: 'stopped',
    operationalStops: [...stage.operationalStops, stop],
  });
  const updatedCheckpoint = QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    stages: { ...checkpoint.stages, [stageId]: updatedStage },
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Authorizes the single explicit relaunch of one terminally stopped model stage. */
export const resumeQualificationOperationalStop = (
  checkpoint: IQualificationAttemptCheckpoint,
): IQualificationAttemptCheckpoint => {
  const stoppedStages = Object.values(checkpoint.stages).filter(
    ({ status }) => status === 'stopped',
  );

  if (stoppedStages.length !== 1) {
    throw new Error('Explicit operational-stop resume requires exactly one stopped stage.');
  }

  const [stoppedStage] = stoppedStages;

  if (stoppedStage === undefined || stoppedStage.hasUsedOperationalStopResume) {
    throw new Error('The stopped stage has already used its one explicit resume.');
  }

  return QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    stages: {
      ...checkpoint.stages,
      [stoppedStage.id]: {
        ...stoppedStage,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        durationMs: null,
        error: null,
        hasUsedOperationalStopResume: true,
      },
    },
  });
};

/** Atomically marks one never-needed confirmation stage group as skipped. */
export const skipQualificationStageGroup = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
  stageIds: readonly string[],
): Promise<IQualificationAttemptCheckpoint> => {
  const stages = stageIds.map((stageId) => checkpoint.stages[stageId]);

  if (stages.some((stage) => stage === undefined)) {
    throw new Error('Cannot skip an unknown qualification stage group.');
  }

  if (stages.every((stage) => stage?.status === 'skipped')) {
    return checkpoint;
  }

  if (stages.some((stage) => stage?.status !== 'pending')) {
    throw new Error('Only a fully pending qualification stage group can be skipped.');
  }

  const completedAt = new Date().toISOString();
  const updatedStages = Object.fromEntries(
    stageIds.map((stageId) => [
      stageId,
      QualificationStageCheckpointSchema.parse({
        ...checkpoint.stages[stageId],
        status: 'skipped',
        startedAt: completedAt,
        completedAt,
        durationMs: 0,
        stageIdentity: null,
        reuseSourceAttemptId: null,
        error: null,
        hasUsedOperationalStopResume: false,
        operationalRetries: [],
        operationalStops: [],
      }),
    ]),
  );
  const updatedCheckpoint = QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    stages: { ...checkpoint.stages, ...updatedStages },
  });
  await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
  return updatedCheckpoint;
};

/** Creates the first atomic checkpoint for a new qualification attempt. */
export const createAttemptCheckpoint = async (options: {
  attemptDirectory: string;
  attemptId: string;
  parentAttemptId: string | null;
  selection: IQualificationSelection;
  isDryRun: boolean;
  mode: 'diagnostic' | 'dry-run' | 'official';
  selectedCaseId: string | null;
  reuseEvidence: boolean;
  packagesRepository: string;
  skillRepository: string;
  profileDigest: string;
  qualificationDigest: string;
  skillDigest: string;
  packagesRepositoryFingerprint: string;
  packagesDigest: string;
  targetDigest: string;
  executionEnvironment: IQualificationExecutionEnvironment;
  initialCandidateTokensConsumed?: number;
  stageIds: readonly string[];
}): Promise<IQualificationAttemptCheckpoint> => {
  const timestamp = new Date().toISOString();
  const checkpoint = QualificationAttemptCheckpointSchema.parse({
    protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    attemptId: options.attemptId,
    parentAttemptId: options.parentAttemptId,
    selection: options.selection,
    status: 'running',
    isDryRun: options.isDryRun,
    mode: options.mode,
    selectedCaseId: options.selectedCaseId,
    reuseEvidence: options.reuseEvidence,
    candidateTokenLimit: QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
    candidateTokensConsumed: options.initialCandidateTokensConsumed ?? 0,
    candidateTokensReserved: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    recordedAt: null,
    packagesRepository: options.packagesRepository,
    skillRepository: options.skillRepository,
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
    skillDigest: options.skillDigest,
    packagesRepositoryFingerprint: options.packagesRepositoryFingerprint,
    packagesDigest: options.packagesDigest,
    targetDigest: options.targetDigest,
    executionEnvironment: options.executionEnvironment,
    candidate: null,
    stages: Object.fromEntries(
      options.stageIds.map((stageId) => [stageId, createPendingStage(stageId)]),
    ),
    workspaceDirectories: {},
  });

  await writeAttemptCheckpoint(options.attemptDirectory, checkpoint);
  return checkpoint;
};

/** Loads and validates one local checkpoint without changing it. */
export const readAttemptCheckpoint = async (
  attemptDirectory: string,
): Promise<IQualificationAttemptCheckpoint> =>
  readJsonFile(getCheckpointPath(attemptDirectory), QualificationAttemptCheckpointSchema);

/** Atomically replaces one local checkpoint after validating the complete state. */
export const writeAttemptCheckpoint = async (
  attemptDirectory: string,
  checkpoint: IQualificationAttemptCheckpoint,
): Promise<void> => {
  const validatedCheckpoint = QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    updatedAt: new Date().toISOString(),
  });
  await writeJsonFileAtomically(getCheckpointPath(attemptDirectory), validatedCheckpoint);
  await writeQualificationStatusAttempt(attemptDirectory, validatedCheckpoint);
};

/** Converts an interrupted running stage back to resumable pending state. */
export const normalizeInterruptedCheckpoint = (
  checkpoint: IQualificationAttemptCheckpoint,
): IQualificationAttemptCheckpoint => {
  const stages = Object.fromEntries(
    Object.entries(checkpoint.stages).map(([stageId, stage]) => [
      stageId,
      stage.status === 'running'
        ? QualificationStageCheckpointSchema.parse({
            ...createPendingStage(stageId),
            stageIdentity: stage.stageIdentity,
            hasUsedOperationalStopResume: stage.hasUsedOperationalStopResume,
            operationalRetries: stage.operationalRetries,
            operationalStops: stage.operationalStops,
          })
        : QualificationStageCheckpointSchema.parse(stage),
    ]),
  );

  return QualificationAttemptCheckpointSchema.parse({
    ...checkpoint,
    candidateTokensConsumed:
      checkpoint.candidateTokensConsumed + checkpoint.candidateTokensReserved,
    candidateTokensReserved: 0,
    status: checkpoint.status === 'running' ? 'incomplete' : checkpoint.status,
    stages,
  });
};
