import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, statfs } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { IEvaluationReplayModel } from '@moldea.ai/website-ui/evaluation-replay-model';
import { z } from 'zod';

import {
  EVALUATION_BATCH_DEFAULT_WORKER_COUNT,
  createEvaluationBatchDiskReservation,
  runWithEvaluationTemporaryStorageGuard,
  type IEvaluationBatchWorkerCount,
} from '../../execution/batch/index.ts';
import { EVALUATION_CONFIRMATION_POLICY } from '../../execution/confirmation/index.ts';
import {
  buildCodexEvaluationHostCommand,
  identifyCodexEvaluationHost,
  parseCodexEvaluationHostCommand,
  prepareCodexEvaluationHome,
  runCodexEvaluationHost,
  runCodexEvaluationOperationalStage,
  type ICodexEvaluationHostIdentity,
} from '../../execution/host/index.ts';
import { storeCompletedEvidenceRun } from '../../evidence/index.ts';
import { createPortableSkillArtifactDigest } from '../../portable/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../resources/index.ts';
import {
  createSemanticCliIdentity,
  readReleaseIdentity,
  SEMANTIC_EVALUATION_PROTOCOL_VERSION,
} from '../../release/index.ts';
import {
  assessSemanticJudgeOutput,
  buildSemanticActorPrompt,
  buildSemanticJudgePrompt,
} from '../judging/index.ts';
import { createSemanticCoverage, createSemanticCoverageDigest } from '../coverage/index.ts';
import {
  createSemanticCaseSuiteDigest,
  createSemanticCaseDefinitionDigest,
  loadSemanticCases,
  type ISemanticCase,
} from '../cases/index.ts';
import {
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingSemanticResultDimensions,
  isSemanticConfirmationEligible,
  parseSemanticEvaluationHostOutput,
} from '../execution/index.ts';
import {
  createSemanticEvidenceBundle,
  type ISemanticAttemptRecord,
  type ISemanticAttemptTrialModel,
  type ISemanticCliIdentity,
} from '../public-evidence/index.ts';
import {
  appendSemanticOperationalRetry,
  attachSemanticActorEvidence,
  completeSemanticActiveTrial,
  createSemanticActiveTrial,
  createSemanticTokenAdmissionController,
  createSemanticReplay,
  getSemanticCandidatePaidTokenCount,
  getSemanticCheckpointPath,
  isSemanticActiveTrialStopped,
  loadSemanticReusableTrials,
  readSemanticCheckpoint,
  selectSemanticReusableTrial,
  stopSemanticOperationalStage,
  type ISemanticActiveTrialCheckpoint,
  type ISemanticCandidateCheckpoint,
  type ISemanticCaseCheckpoint,
  type ISemanticRecordedCase,
  type ISemanticRecordedTrial,
  type ISemanticReusableTrial,
  type ISemanticTokenAdmissionController,
  writeSemanticCheckpoint,
} from '../recording/index.ts';
import {
  createSemanticActorStageIdentity,
  createSemanticJudgeStageIdentity,
  createSemanticStageReuseRecord,
} from '../stages/index.ts';
import {
  createActorRepository,
  diffSemanticWorkspaceSnapshots,
  snapshotSemanticWorkspace,
  type ISemanticWorkspaceSnapshot,
} from '../workspace/index.ts';
import {
  runSemanticCaseExecution,
  type ISemanticCaseTrialExecutionOptions,
} from './case-execution.ts';
import { parseSemanticEvaluationArguments } from './parser.ts';
import type { ISemanticDiagnosticSelector } from './types.ts';

const EMPTY_SEMANTIC_WORKSPACE_SNAPSHOT: ISemanticWorkspaceSnapshot = new Map();

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '../../..');
const CASES_ROOT = path.join(REPOSITORY_ROOT, 'src', 'semantic', 'cases');
const DEFAULT_HOST_COMMAND = [
  'codex',
  'exec',
  '--ignore-user-config',
  '--ignore-rules',
  '--ephemeral',
  '--skip-git-repo-check',
  '--dangerously-bypass-approvals-and-sandbox',
  '-c',
  'shell_environment_policy.inherit=none',
  '-',
] as const;
const LOCAL_ATTEMPT_SCHEMA_VERSION = 7;
const LOCAL_EVIDENCE_SCHEMA_VERSION = 11;
const MAXIMUM_OPERATIONAL_RETRY_COUNT = 1;

const PreparedWebsitePayloadSchema = z.object({
  websiteModel: z.object({
    attempts: z.array(
      z.object({
        cases: z.array(z.object({ id: z.string(), status: z.string() })),
      }),
    ),
  }),
});

type ISemanticTrialExecution = {
  publicTrial: ISemanticAttemptTrialModel;
  recordedTrial: ISemanticRecordedTrial;
};

// semantic trial boundary with candidate-wide paid-token admission
export type ISemanticRunnerTrialExecutionOptions = ISemanticCaseTrialExecutionOptions & {
  tokenController: ISemanticTokenAdmissionController;
};

type ISemanticRunnerTrialExecutor = (
  options: ISemanticRunnerTrialExecutionOptions,
) => Promise<ISemanticRecordedTrial>;

type ISemanticCaseRunnerOptions = {
  cases: ISemanticCase[];
  checkpoint: ISemanticCandidateCheckpoint | null;
  executeTrial: ISemanticRunnerTrialExecutor;
  repositoryRoot: string;
  workerCount: IEvaluationBatchWorkerCount;
};

const createAttemptId = (): string =>
  `sem-${new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/gu, '')
    .slice(0, 17)}-${randomUUID().replaceAll('-', '').slice(0, 8)}`;

const createJsonSha256 = (input: unknown): string =>
  createHash('sha256')
    .update(`${JSON.stringify(input)}\n`)
    .digest('hex');

const addJsonOutput = (command: readonly string[], role: 'actor' | 'judge'): string[] => {
  const completeCommand = buildCodexEvaluationHostCommand(command, role);
  return completeCommand.includes('--json')
    ? completeCommand
    : [...completeCommand.slice(0, -1), '--json', '-'];
};

const areSnapshotsEqual = (
  left: Awaited<ReturnType<typeof snapshotSemanticWorkspace>>,
  right: Awaited<ReturnType<typeof snapshotSemanticWorkspace>>,
): boolean => JSON.stringify([...left]) === JSON.stringify([...right]);

const serializeWorkspaceSnapshot = (
  snapshot: Awaited<ReturnType<typeof snapshotSemanticWorkspace>>,
): Array<{ path: string; state: unknown }> =>
  [...snapshot.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([snapshotPath, state]) => ({ path: snapshotPath, state }));

const runHostStage = async (options: {
  activeTrial: ISemanticActiveTrialCheckpoint;
  isOperationalResumeRequested: boolean;
  operation: (signal: AbortSignal) => Promise<string>;
  persistActiveTrial: (activeTrial: ISemanticActiveTrialCheckpoint) => Promise<void>;
  reservationId: string;
  stage: 'actor' | 'judge';
  temporaryRoot: string;
  tokenController: ISemanticTokenAdmissionController;
}): Promise<{
  activeTrial: ISemanticActiveTrialCheckpoint;
  output: string;
  releaseReservation: () => Promise<void>;
}> => {
  let activeTrial = options.activeTrial;
  let isReservationActive = false;
  const failureCountKey = `${options.stage}FailureCount` as const;
  const isStopped = isSemanticActiveTrialStopped(activeTrial);
  if (isStopped && !options.isOperationalResumeRequested) {
    throw new Error(
      `Semantic ${options.stage} stage is stopped; use --resume-stopped-stage for one additional attempt.`,
    );
  }
  const initialFailureCount = isStopped
    ? MAXIMUM_OPERATIONAL_RETRY_COUNT
    : activeTrial.operationalRetries[failureCountKey];
  const releaseReservation = async (): Promise<void> => {
    if (!isReservationActive) return;
    await options.tokenController.release(options.reservationId);
    isReservationActive = false;
  };
  try {
    const output = await runWithEvaluationTemporaryStorageGuard(options.temporaryRoot, (signal) =>
      runCodexEvaluationOperationalStage({
        initialFailureCount,
        maximumRetryCount: MAXIMUM_OPERATIONAL_RETRY_COUNT,
        onExhausted: async (exhaustion) => {
          activeTrial = stopSemanticOperationalStage(
            activeTrial,
            options.stage,
            exhaustion,
            isStopped,
          );
          await options.persistActiveTrial(activeTrial);
          await releaseReservation();
        },
        onRetry: async (retry) => {
          activeTrial = appendSemanticOperationalRetry(activeTrial, options.stage, retry);
          await options.persistActiveTrial(activeTrial);
          await releaseReservation();
        },
        operation: async () => {
          await options.tokenController.reserve(options.reservationId);
          isReservationActive = true;
          return options.operation(signal);
        },
        signal,
      }),
    );
    return { activeTrial, output, releaseReservation };
  } catch (error) {
    await releaseReservation();
    throw error;
  }
};

const runSemanticTrial = async (options: {
  activeTrial: ISemanticActiveTrialCheckpoint | null;
  actorCommand: readonly string[];
  actorHost: ICodexEvaluationHostIdentity;
  caseDefinition: ISemanticCase;
  cli: ISemanticCliIdentity;
  confirmationIndex: 1 | 2 | 3 | null;
  artifactDigest: string;
  isOperationalResumeRequested: boolean;
  judgeCommand: readonly string[];
  judgeHost: ICodexEvaluationHostIdentity;
  persistActiveTrial: (activeTrial: ISemanticActiveTrialCheckpoint) => Promise<void>;
  reusableTrials: readonly ISemanticReusableTrial[];
  tokenController: ISemanticTokenAdmissionController;
}): Promise<ISemanticTrialExecution> => {
  const evaluationRoot = await mkdtemp(
    path.join(tmpdir(), `moldea-semantic-${options.caseDefinition.id}-`),
  );
  try {
    const actorHome = path.join(evaluationRoot, 'actor-home');
    const actorToolDirectory = path.join(evaluationRoot, 'actor-tools');
    const { readOnlyMounts, repositoryPath } = await createActorRepository(
      evaluationRoot,
      options.caseDefinition,
      actorHome,
      actorToolDirectory,
    );
    const beforeWorkspace = await snapshotSemanticWorkspace(repositoryPath);
    const beforeGitState = await snapshotSemanticWorkspace(path.join(repositoryPath, '.git'));
    const relatedMounts = readOnlyMounts.filter(({ target }) => target !== '/home/evaluator/bin');
    const relatedBefore = await Promise.all(
      relatedMounts.map(async ({ source }) => snapshotSemanticWorkspace(source)),
    );
    const actorPrompt = buildSemanticActorPrompt(options.caseDefinition);
    const caseDefinitionDigest = createSemanticCaseDefinitionDigest(options.caseDefinition);
    const actorStageIdentity = createSemanticActorStageIdentity({
      actorCommand: options.actorCommand,
      actorHost: options.actorHost,
      actorPrompt,
      artifactDigest: options.artifactDigest,
      caseDefinitionDigest,
      cli: options.cli,
      confirmationIndex: options.confirmationIndex,
      evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
      readOnlyMountFixtures: relatedMounts.map(({ target }, index) => ({
        snapshot: serializeWorkspaceSnapshot(
          relatedBefore[index] ?? EMPTY_SEMANTIC_WORKSPACE_SNAPSHOT,
        ),
        target,
      })),
      repositoryFixture: serializeWorkspaceSnapshot(beforeWorkspace),
      resourceProfiles: MOLDEA_SKILL_RESOURCE_PROFILES,
    });
    const createJudgeIdentity = (recordedTrial: ISemanticRecordedTrial) => {
      const judgePrompt = buildSemanticJudgePrompt({
        actorCommandPolicyEvidence: recordedTrial.trial.actorCommandPolicyEvidence,
        actorExecutionEvidence: recordedTrial.actorExecutionEvidence,
        actorResourceEvidence: recordedTrial.trial.actorResourceEvidence,
        actorResponse: recordedTrial.actorResponse,
        caseDefinition: options.caseDefinition,
        repositoryEvidence: options.caseDefinition.input.repositoryEvidence,
        workspaceChanges: recordedTrial.workspaceChanges,
      });
      return createSemanticJudgeStageIdentity({
        actorEvidence: {
          actorResponse: recordedTrial.actorResponse,
          workspaceChanges: recordedTrial.workspaceChanges,
        },
        actorIdentitySha256: actorStageIdentity.sha256,
        caseDefinitionDigest,
        evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
        judgeCommand: options.judgeCommand,
        judgeHost: options.judgeHost,
        judgePrompt,
      });
    };
    if (
      options.activeTrial !== null &&
      options.activeTrial.confirmationIndex !== options.confirmationIndex
    ) {
      throw new Error('Semantic active trial does not match the requested confirmation index.');
    }
    let activeTrial =
      options.activeTrial ??
      createSemanticActiveTrial(options.confirmationIndex, new Date().toISOString());
    if (options.activeTrial === null) await options.persistActiveTrial(activeTrial);
    if (activeTrial.phase === 'trial-complete') {
      if (activeTrial.recordedTrial === null) {
        throw new Error('Semantic completed active trial has no recorded evidence.');
      }
      return {
        publicTrial: activeTrial.recordedTrial.trial,
        recordedTrial: activeTrial.recordedTrial,
      };
    }

    const reusableTrial =
      options.activeTrial === null
        ? selectSemanticReusableTrial({
            actorIdentitySha256: actorStageIdentity.sha256,
            candidates: options.reusableTrials,
            caseId: options.caseDefinition.id,
            confirmationIndex: options.confirmationIndex,
            judgeIdentitySha256: (candidate) => createJudgeIdentity(candidate.recordedTrial).sha256,
          })
        : null;
    if (reusableTrial !== null) {
      const judgeStageIdentity = createJudgeIdentity(reusableTrial.recordedTrial);
      const trialIdentity = {
        caseId: options.caseDefinition.id,
        confirmationIndex: options.confirmationIndex,
        kind: options.confirmationIndex === null ? ('initial' as const) : ('confirmation' as const),
      };
      const actorReuse = createSemanticStageReuseRecord({
        identitySha256: actorStageIdentity.sha256,
        sourceAttemptId: reusableTrial.sourceAttemptId,
        sourceEvidenceSha256: reusableTrial.sourceEvidenceSha256,
        stage: 'actor',
        trial: trialIdentity,
      });
      const judgeReuse = createSemanticStageReuseRecord({
        identitySha256: judgeStageIdentity.sha256,
        sourceAttemptId: reusableTrial.sourceAttemptId,
        sourceEvidenceSha256: reusableTrial.sourceEvidenceSha256,
        stage: 'judge',
        trial: trialIdentity,
      });
      const publicTrial: ISemanticAttemptTrialModel = {
        ...reusableTrial.recordedTrial.trial,
        executionOrigin: 'reused',
        stageReuse: {
          actor: { ...actorReuse, stage: 'actor' },
          judge: { ...judgeReuse, stage: 'judge' },
        },
      };
      const recordedTrial = {
        ...reusableTrial.recordedTrial,
        operationalRetries: {
          actorFailureCount: 0,
          judgeFailureCount: 0,
          lastFailure: null,
        },
        stageIdentities: {
          actorSha256: actorStageIdentity.sha256,
          judgeSha256: judgeStageIdentity.sha256,
        },
        trial: publicTrial,
      };
      activeTrial = completeSemanticActiveTrial(
        attachSemanticActorEvidence(
          activeTrial,
          {
            actorExecutionEvidence: recordedTrial.actorExecutionEvidence,
            actorResourceEvidence: recordedTrial.trial.actorResourceEvidence,
            actorStageIdentitySha256: actorStageIdentity.sha256,
            commandPolicyEvidence: recordedTrial.trial.actorCommandPolicyEvidence,
            isMountIntegrityPassing: recordedTrial.trial.dimensions.mountIntegrity,
            isRepositoryControlPassing: recordedTrial.trial.dimensions.repositoryControl,
            response: recordedTrial.actorResponse,
            usage: recordedTrial.trial.actorUsage,
            workspaceChanges: recordedTrial.workspaceChanges,
          },
          new Date().toISOString(),
        ),
        recordedTrial,
        new Date().toISOString(),
      );
      await options.persistActiveTrial(activeTrial);
      return {
        publicTrial,
        recordedTrial,
      };
    }

    if (activeTrial.phase === 'actor-pending') {
      const actorExecution = await runHostStage({
        activeTrial,
        isOperationalResumeRequested: options.isOperationalResumeRequested,
        operation: (signal) =>
          runCodexEvaluationHost({
            command: options.actorCommand,
            cwd: repositoryPath,
            includeWorkspaceBinaryDirectory: true,
            prompt: actorPrompt,
            readOnlyMounts,
            readOnlyWorkspacePaths: ['.agents', '.git'],
            role: 'actor',
            sandboxHome: actorHome,
            signal,
          }),
        persistActiveTrial: options.persistActiveTrial,
        reservationId: options.caseDefinition.id,
        stage: 'actor',
        temporaryRoot: evaluationRoot,
        tokenController: options.tokenController,
      });
      activeTrial = actorExecution.activeTrial;
      try {
        const actorEvidence = parseSemanticEvaluationHostOutput(actorExecution.output, {
          cliVersion: options.cli.version,
          jsonSchemaVersion: options.cli.jsonSchemaVersion,
        });
        const afterWorkspace = await snapshotSemanticWorkspace(repositoryPath);
        const afterGitState = await snapshotSemanticWorkspace(path.join(repositoryPath, '.git'));
        const workspaceChanges = diffSemanticWorkspaceSnapshots(beforeWorkspace, afterWorkspace);
        const relatedAfter = await Promise.all(
          relatedMounts.map(async ({ source }) => snapshotSemanticWorkspace(source)),
        );
        const isMountIntegrityPassing = relatedBefore.every((snapshot, index) => {
          const afterSnapshot = relatedAfter[index];
          return afterSnapshot !== undefined && areSnapshotsEqual(snapshot, afterSnapshot);
        });
        activeTrial = attachSemanticActorEvidence(
          activeTrial,
          {
            ...actorEvidence,
            actorStageIdentitySha256: actorStageIdentity.sha256,
            isMountIntegrityPassing,
            isRepositoryControlPassing: areSnapshotsEqual(beforeGitState, afterGitState),
            workspaceChanges,
          },
          new Date().toISOString(),
        );
        await options.persistActiveTrial(activeTrial);
      } finally {
        await actorExecution.releaseReservation();
      }
    }

    const actorEvidence = activeTrial.actorEvidence;
    if (activeTrial.phase !== 'judge-pending' || actorEvidence === null) {
      throw new Error('Semantic judge stage requires durable actor evidence.');
    }
    if (actorEvidence.actorStageIdentitySha256 !== actorStageIdentity.sha256) {
      throw new Error('Semantic active actor evidence does not match the current stage identity.');
    }

    const judgeHome = path.join(evaluationRoot, 'judge-home');
    await prepareCodexEvaluationHome(judgeHome);
    const judgePrompt = buildSemanticJudgePrompt({
      actorCommandPolicyEvidence: actorEvidence.commandPolicyEvidence,
      actorExecutionEvidence: actorEvidence.actorExecutionEvidence,
      actorResourceEvidence: actorEvidence.actorResourceEvidence,
      actorResponse: actorEvidence.response,
      caseDefinition: options.caseDefinition,
      repositoryEvidence: options.caseDefinition.input.repositoryEvidence,
      workspaceChanges: actorEvidence.workspaceChanges,
    });
    const judgeExecution = await runHostStage({
      activeTrial,
      isOperationalResumeRequested: options.isOperationalResumeRequested,
      operation: (signal) =>
        runCodexEvaluationHost({
          command: options.judgeCommand,
          cwd: repositoryPath,
          prompt: judgePrompt,
          readOnlyMounts: relatedMounts,
          readOnlyWorkspacePaths: ['.agents', '.git'],
          role: 'judge',
          sandboxHome: judgeHome,
          signal,
          workspaceAccess: 'read-only',
        }),
      persistActiveTrial: options.persistActiveTrial,
      reservationId: options.caseDefinition.id,
      stage: 'judge',
      temporaryRoot: evaluationRoot,
      tokenController: options.tokenController,
    });
    activeTrial = judgeExecution.activeTrial;
    try {
      const judgeEvidence = parseSemanticEvaluationHostOutput(judgeExecution.output, {
        cliVersion: options.cli.version,
        jsonSchemaVersion: options.cli.jsonSchemaVersion,
      });
      const judgeStageIdentity = createSemanticJudgeStageIdentity({
        actorEvidence: {
          actorResponse: actorEvidence.response,
          workspaceChanges: actorEvidence.workspaceChanges,
        },
        actorIdentitySha256: actorStageIdentity.sha256,
        caseDefinitionDigest,
        evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
        judgeCommand: options.judgeCommand,
        judgeHost: options.judgeHost,
        judgePrompt,
      });
      const assessment = assessSemanticJudgeOutput(
        options.caseDefinition,
        judgeEvidence.response,
        actorEvidence.response,
      );
      const dimensions = createSemanticResultDimensions({
        actorCommandPolicy: actorEvidence.commandPolicyEvidence,
        actorResourceEvidence: actorEvidence.actorResourceEvidence,
        caseDefinition: options.caseDefinition,
        isMountIntegrityPassing: actorEvidence.isMountIntegrityPassing,
        isRepositoryControlPassing: actorEvidence.isRepositoryControlPassing,
        isSemanticPassing: assessment.isPassed,
        judgeCommandPolicy: judgeEvidence.commandPolicyEvidence,
      });
      const evaluatedAt = new Date().toISOString();
      const publicTrial: ISemanticAttemptTrialModel = {
        actorCommandPolicyEvidence: actorEvidence.commandPolicyEvidence,
        actorResourceEvidence: actorEvidence.actorResourceEvidence,
        actorHost: { ...options.actorHost, role: 'actor' },
        actorUsage: actorEvidence.usage,
        confirmationEligible: isSemanticConfirmationEligible(dimensions),
        confirmationIndex: options.confirmationIndex,
        dimensions,
        evaluatedAt,
        executionOrigin: 'executed',
        forbidden: assessment.forbidden,
        failureClassifications: getSemanticFailureClassifications(dimensions),
        judgeCommandPolicyEvidence: judgeEvidence.commandPolicyEvidence,
        judgeHost: { ...options.judgeHost, role: 'judge' },
        judgeUsage: judgeEvidence.usage,
        kind: options.confirmationIndex === null ? 'initial' : 'confirmation',
        observed: assessment.observed,
        passed: hasPassingSemanticResultDimensions(dimensions),
        rationale: assessment.rationale,
        stageReuse: null,
      };
      const recordedTrial: ISemanticRecordedTrial = {
        actorExecutionEvidence: actorEvidence.actorExecutionEvidence,
        actorResponse: actorEvidence.response,
        developerDirection: options.caseDefinition.input.developerDirection,
        operationalRetries: activeTrial.operationalRetries,
        stageIdentities: {
          actorSha256: actorStageIdentity.sha256,
          judgeSha256: judgeStageIdentity.sha256,
        },
        trial: publicTrial,
        workspaceChanges: actorEvidence.workspaceChanges,
      };
      activeTrial = completeSemanticActiveTrial(activeTrial, recordedTrial, evaluatedAt);
      await options.persistActiveTrial(activeTrial);
      return {
        publicTrial,
        recordedTrial,
      };
    } finally {
      await judgeExecution.releaseReservation();
    }
  } finally {
    await rm(evaluationRoot, { force: true, recursive: true });
  }
};

/**
 * Runs semantic cases through the production live-state and checkpoint persistence boundary.
 * @param options Selected cases, candidate state, trial executor, and worker configuration.
 * @returns A promise resolving to all recorded cases in selected-case order.
 * @throws
 * - Semantic committed case does not match its private checkpoint.
 * - Semantic private case checkpoint does not match its case definition.
 * - Semantic case resolution requires an initial trial checkpoint.
 * - Semantic confirmation policy did not resolve the selected case.
 * - Evaluation worker count must be 1, 2, or 4.
 */
export const executeSemanticCases = async (
  options: ISemanticCaseRunnerOptions,
): Promise<ISemanticRecordedCase[]> => {
  let checkpointMutationQueue = Promise.resolve();
  const mutateCheckpoint = async (
    operation: (currentCheckpoint: ISemanticCandidateCheckpoint) => void,
  ): Promise<void> => {
    if (options.checkpoint === null) return;
    const queuedMutation = checkpointMutationQueue.then(async () => {
      if (options.checkpoint === null) return;
      operation(options.checkpoint);
      options.checkpoint.updatedAt = new Date().toISOString();
      await writeSemanticCheckpoint(options.repositoryRoot, options.checkpoint);
    });
    checkpointMutationQueue = queuedMutation.catch(() => {});
    await queuedMutation;
  };

  const caseCheckpointStates = new Map<string, ISemanticCaseCheckpoint>(
    Object.entries(options.checkpoint?.caseCheckpoints ?? {}),
  );
  const tokenController = createSemanticTokenAdmissionController({
    getConsumedTokenCount: () =>
      getSemanticCandidatePaidTokenCount(
        options.checkpoint?.cases ?? [],
        Object.fromEntries(caseCheckpointStates),
      ),
  });

  const executedCases = await runSemanticCaseExecution({
    cases: options.cases,
    commitCase: async (recordedCase) => {
      if (options.checkpoint === null) {
        const privateCheckpoint = caseCheckpointStates.get(recordedCase.id);
        if (
          privateCheckpoint === undefined ||
          JSON.stringify(privateCheckpoint.completedCase) !== JSON.stringify(recordedCase)
        ) {
          throw new Error('Semantic committed case does not match its private checkpoint.');
        }
        caseCheckpointStates.delete(recordedCase.id);
        return;
      }
      await mutateCheckpoint((currentCheckpoint) => {
        const privateCheckpoint = currentCheckpoint.caseCheckpoints[recordedCase.id];
        if (
          privateCheckpoint === undefined ||
          JSON.stringify(privateCheckpoint.completedCase) !== JSON.stringify(recordedCase)
        ) {
          throw new Error('Semantic committed case does not match its private checkpoint.');
        }
        currentCheckpoint.cases.push(recordedCase);
        delete currentCheckpoint.caseCheckpoints[recordedCase.id];
        caseCheckpointStates.delete(recordedCase.id);
      });
    },
    executeTrial: (trialOptions) => options.executeTrial({ ...trialOptions, tokenController }),
    getCaseCheckpoint: (caseId) => caseCheckpointStates.get(caseId) ?? null,
    persistCaseCheckpoint: async (caseCheckpoint) => {
      caseCheckpointStates.set(caseCheckpoint.caseId, caseCheckpoint);
      await mutateCheckpoint((currentCheckpoint) => {
        currentCheckpoint.caseCheckpoints[caseCheckpoint.caseId] = caseCheckpoint;
      });
    },
    workerCount: options.workerCount,
  });

  return options.checkpoint === null ? executedCases : options.checkpoint.cases;
};

const resolveDiagnosticCases = async (
  cases: ISemanticCase[],
  selector: ISemanticDiagnosticSelector,
): Promise<ISemanticCase[]> => {
  if (selector.kind === 'all') return cases;
  if (selector.kind === 'cases') {
    const ids = new Set(selector.value.split(','));
    const selectedCases = cases.filter(({ id }) => ids.has(id));
    if (selectedCases.length !== ids.size) throw new Error('Unknown semantic diagnostic case id.');
    return selectedCases;
  }
  if (selector.kind === 'claims') {
    const claimIds = new Set(selector.value.split(','));
    const selectedCases = cases.filter(({ coverageClaimIds }) =>
      coverageClaimIds.some((claimId) => claimIds.has(claimId)),
    );
    if (selectedCases.length === 0) throw new Error('No semantic cases match the selected claims.');
    return selectedCases;
  }

  const { readCompletedEvidenceRun } = await import('../../evidence/index.ts');
  const bundle = await readCompletedEvidenceRun(REPOSITORY_ROOT, 'semantic', selector.value);
  const payload = PreparedWebsitePayloadSchema.parse(bundle.payload);
  const failedIds = new Set(
    payload.websiteModel.attempts
      .flatMap(({ cases: attemptCases }) => attemptCases)
      .filter(({ status }) => status === 'failed' || status === 'pending')
      .map(({ id }) => id),
  );
  return cases.filter(({ id }) => failedIds.has(id));
};

const createAttemptRecord = (options: {
  actorHost: ICodexEvaluationHostIdentity;
  artifactDigest: string;
  attemptId: string;
  cases: ISemanticRecordedCase[];
  caseSuiteDigest: string;
  cli: ISemanticCliIdentity;
  coverageDigest: string;
  createdAt: string;
  evidenceSha256: string;
  judgeHost: ICodexEvaluationHostIdentity;
}): ISemanticAttemptRecord => {
  const caseResults = options.cases.map(({ confirmationStatus, id, status, trials }) => ({
    confirmationStatus,
    id,
    status,
    trials: trials.map(({ trial }) => trial),
  }));
  const failedCaseCount = caseResults.filter(({ status }) => status === 'failed').length;
  const pendingCaseCount = caseResults.filter(({ status }) => status === 'pending').length;
  const updatedAt = new Date().toISOString();
  return {
    artifactDigest: options.artifactDigest,
    attemptId: options.attemptId,
    caseSuiteDigest: options.caseSuiteDigest,
    cases: caseResults,
    cli: options.cli,
    confirmationPolicy: EVALUATION_CONFIRMATION_POLICY,
    coverageDigest: options.coverageDigest,
    createdAt: options.createdAt,
    evidence: {
      evaluationProtocolVersion: SEMANTIC_EVALUATION_PROTOCOL_VERSION,
      kind: 'candidate',
      path: `.evidence/semantic/results/attempts/${options.attemptId}/evidence.json`,
      schemaVersion: LOCAL_EVIDENCE_SCHEMA_VERSION,
      sha256: options.evidenceSha256,
    },
    executedStageCount: caseResults.reduce(
      (count, entry) =>
        count + entry.trials.filter(({ stageReuse }) => stageReuse === null).length * 2,
      0,
    ),
    executedTrialCount: caseResults.reduce(
      (count, entry) => count + entry.trials.filter(({ stageReuse }) => stageReuse === null).length,
      0,
    ),
    failedCaseCount,
    hostContract: {
      actor: {
        developerInstructionsSha256: options.actorHost.developerInstructionsSha256,
        model: options.actorHost.model,
        name: options.actorHost.name,
        reasoningEffort: options.actorHost.reasoningEffort,
        role: 'actor',
      },
      judge: {
        developerInstructionsSha256: options.judgeHost.developerInstructionsSha256,
        model: options.judgeHost.model,
        name: options.judgeHost.name,
        reasoningEffort: options.judgeHost.reasoningEffort,
        role: 'judge',
      },
    },
    passedCaseCount: caseResults.filter(({ status }) => status === 'passed').length,
    pendingCaseCount,
    recordedAt: updatedAt,
    recoveredCaseCount: caseResults.filter(({ status }) => status === 'recovered').length,
    reusedStageCount: caseResults.reduce(
      (count, entry) =>
        count + entry.trials.filter(({ stageReuse }) => stageReuse !== null).length * 2,
      0,
    ),
    reusedTrialCount: caseResults.reduce(
      (count, entry) => count + entry.trials.filter(({ stageReuse }) => stageReuse !== null).length,
      0,
    ),
    schemaVersion: LOCAL_ATTEMPT_SCHEMA_VERSION,
    status: pendingCaseCount > 0 ? 'incomplete' : failedCaseCount > 0 ? 'failed' : 'passed',
    stopReason: failedCaseCount > 0 ? 'complete-with-failures' : 'complete',
    totalCaseCount: caseResults.length,
    updatedAt,
  };
};

const recordSemanticAttempt = async (options: {
  actorHost: ICodexEvaluationHostIdentity;
  artifactDigest: string;
  attemptId: string;
  cases: ISemanticRecordedCase[];
  caseSuiteDigest: string;
  cli: ISemanticCliIdentity;
  coverage: ReturnType<typeof createSemanticCoverage>;
  coverageDigest: string;
  createdAt: string;
  definitions: ISemanticCase[];
  judgeHost: ICodexEvaluationHostIdentity;
}): Promise<ISemanticAttemptRecord> => {
  const evidenceRecord = { cases: options.cases, schemaVersion: LOCAL_EVIDENCE_SCHEMA_VERSION };
  const evidenceSha256 = createJsonSha256(evidenceRecord);
  const result = createAttemptRecord({ ...options, evidenceSha256 });
  const replays = new Map<string, IEvaluationReplayModel>(
    options.cases.map((recordedCase) => [recordedCase.id, createSemanticReplay(recordedCase)]),
  );
  const attemptPath = `.evidence/semantic/results/attempts/${options.attemptId}/attempt.json`;
  const evidencePath = `.evidence/semantic/results/attempts/${options.attemptId}/evidence.json`;
  const bundle = createSemanticEvidenceBundle({
    artifacts: [
      {
        content: Buffer.from(`${JSON.stringify(result, null, 2)}\n`),
        mediaType: 'application/json',
        path: attemptPath,
      },
      {
        content: Buffer.from(`${JSON.stringify(evidenceRecord, null, 2)}\n`),
        mediaType: 'application/json',
        path: evidencePath,
      },
      {
        content: Buffer.from(`${JSON.stringify(options.coverage, null, 2)}\n`),
        mediaType: 'application/json',
        path: '.evidence/semantic/results/coverage.json',
      },
    ],
    classification: 'official',
    definitions: options.definitions,
    replays,
    result,
    version: readReleaseIdentity(REPOSITORY_ROOT).releaseVersion,
  });
  await storeCompletedEvidenceRun(REPOSITORY_ROOT, bundle);
  return result;
};

const verifyLocalSemanticRuns = async (): Promise<number> => {
  const runsRoot = path.join(REPOSITORY_ROOT, '.evidence', 'runs', 'semantic');
  if (!existsSync(runsRoot)) return 0;
  const { readCompletedEvidenceRun } = await import('../../evidence/index.ts');
  const fileNames = (await readdir(runsRoot)).filter(
    (fileName) => fileName.endsWith('.json') && fileName !== 'latest.json',
  );
  for (const fileName of fileNames) {
    await readCompletedEvidenceRun(REPOSITORY_ROOT, 'semantic', fileName.slice(0, -5));
  }
  return fileNames.length;
};

const run = async (): Promise<void> => {
  const arguments_ = parseSemanticEvaluationArguments(process.argv.slice(2));
  const cases = await loadSemanticCases(CASES_ROOT);
  const coverage = createSemanticCoverage(cases);
  const artifactDigest = createPortableSkillArtifactDigest(REPOSITORY_ROOT);
  const caseSuiteDigest = createSemanticCaseSuiteDigest(cases);
  const coverageDigest = createSemanticCoverageDigest(coverage);
  const cli = createSemanticCliIdentity(REPOSITORY_ROOT);

  if (arguments_.isPreflightRequested) {
    process.stdout.write(
      `${JSON.stringify({ artifactDigest, caseCount: cases.length, caseSuiteDigest, coverageDigest })}\n`,
    );
    return;
  }
  if (arguments_.isVerifyAttemptsRequested) {
    process.stdout.write(
      `${JSON.stringify({ verifiedAttemptCount: await verifyLocalSemanticRuns() })}\n`,
    );
    return;
  }
  if (arguments_.isRecordCheckpointRequested) {
    const checkpoint = await readSemanticCheckpoint(REPOSITORY_ROOT);
    process.stdout.write(`${JSON.stringify(checkpoint)}\n`);
    return;
  }

  const baseActorCommand = parseCodexEvaluationHostCommand(
    'MOLDEA_EVAL_ACTOR_COMMAND_JSON',
    DEFAULT_HOST_COMMAND,
  );
  const baseJudgeCommand = parseCodexEvaluationHostCommand(
    'MOLDEA_EVAL_JUDGE_COMMAND_JSON',
    DEFAULT_HOST_COMMAND,
  );
  const actorCommand = addJsonOutput(baseActorCommand, 'actor');
  const judgeCommand = addJsonOutput(baseJudgeCommand, 'judge');
  const actorHost = identifyCodexEvaluationHost(actorCommand, 'actor');
  const judgeHost = identifyCodexEvaluationHost(judgeCommand, 'judge');
  const reusableTrials = arguments_.isRecordRequested
    ? await loadSemanticReusableTrials(REPOSITORY_ROOT)
    : [];
  let attemptId = createAttemptId();
  let createdAt = new Date().toISOString();
  let selectedCases: ISemanticCase[];
  if (arguments_.requestedCaseId !== undefined) {
    const selectedCase = cases.find(({ id }) => id === arguments_.requestedCaseId);
    if (selectedCase === undefined)
      throw new Error(`Unknown semantic case ${arguments_.requestedCaseId}.`);
    selectedCases = [selectedCase];
  } else if (arguments_.diagnosticBatchSelector !== null) {
    selectedCases = await resolveDiagnosticCases(cases, arguments_.diagnosticBatchSelector);
  } else {
    selectedCases = cases;
  }

  if (arguments_.isDiagnoseBatchRequested && selectedCases.length === 0) {
    if (arguments_.isResumeStoppedStageRequested) {
      throw new Error('--resume-stopped-stage requires one terminally stopped semantic stage.');
    }
    process.stdout.write('[]\n');
    return;
  }

  const selectedCaseIds = selectedCases.map(({ id }) => id);
  let checkpoint: ISemanticCandidateCheckpoint | null = null;
  let casesToExecute = selectedCases;
  const checkpointMode = arguments_.isRecordRequested
    ? ('official' as const)
    : arguments_.isDiagnoseBatchRequested
      ? ('diagnostic' as const)
      : null;
  if (checkpointMode !== null) {
    const checkpointPath = getSemanticCheckpointPath(REPOSITORY_ROOT);
    if (arguments_.isRestartRequested) {
      await rm(checkpointPath, { force: true });
    } else if (existsSync(checkpointPath)) {
      checkpoint = await readSemanticCheckpoint(REPOSITORY_ROOT);
      const expectedIdentity = {
        actorHost,
        artifactDigest,
        caseSuiteDigest,
        cli,
        coverageDigest,
        judgeHost,
        mode: checkpointMode,
        selectedCaseIds,
      };
      const actualIdentity = {
        actorHost: checkpoint.actorHost,
        artifactDigest: checkpoint.artifactDigest,
        caseSuiteDigest: checkpoint.caseSuiteDigest,
        cli: checkpoint.cli,
        coverageDigest: checkpoint.coverageDigest,
        judgeHost: checkpoint.judgeHost,
        mode: checkpoint.mode,
        selectedCaseIds: checkpoint.selectedCaseIds,
      };
      if (JSON.stringify(actualIdentity) !== JSON.stringify(expectedIdentity)) {
        throw new Error(
          'The semantic checkpoint does not match this exact run. Use --restart to replace it.',
        );
      }
      attemptId = checkpoint.attemptId;
      createdAt = checkpoint.createdAt;
      casesToExecute = selectedCases.slice(checkpoint.cases.length);
    }
    checkpoint ??= {
      actorHost,
      artifactDigest,
      attemptId,
      caseCheckpoints: {},
      caseSuiteDigest,
      cases: [],
      cli,
      coverageDigest,
      createdAt,
      judgeHost,
      mode: checkpointMode,
      schemaVersion: 2,
      selectedCaseIds,
      updatedAt: createdAt,
    };
    const stoppedTrials = Object.values(checkpoint.caseCheckpoints).filter(
      ({ activeTrial }) => activeTrial !== null && isSemanticActiveTrialStopped(activeTrial),
    );
    if (arguments_.isResumeStoppedStageRequested && stoppedTrials.length !== 1) {
      throw new Error('--resume-stopped-stage requires exactly one stopped semantic stage.');
    }
    if (!arguments_.isResumeStoppedStageRequested && stoppedTrials.length > 0) {
      throw new Error(
        'The semantic run contains a terminally stopped stage; use --resume-stopped-stage for one additional attempt.',
      );
    }
    await writeSemanticCheckpoint(REPOSITORY_ROOT, checkpoint);
  }

  const workerCount = arguments_.workerCount ?? EVALUATION_BATCH_DEFAULT_WORKER_COUNT;
  const temporaryFilesystem = await statfs(tmpdir(), { bigint: true });
  createEvaluationBatchDiskReservation(
    workerCount,
    temporaryFilesystem.bavail * temporaryFilesystem.bsize,
  );
  const recordedCases = await executeSemanticCases({
    cases: casesToExecute,
    checkpoint,
    executeTrial: async ({
      activeTrial,
      caseDefinition,
      confirmationIndex,
      persistActiveTrial,
      tokenController,
    }) => {
      const trialExecution = await runSemanticTrial({
        activeTrial,
        actorCommand,
        actorHost,
        artifactDigest,
        caseDefinition,
        cli,
        confirmationIndex,
        isOperationalResumeRequested: arguments_.isResumeStoppedStageRequested,
        judgeCommand,
        judgeHost,
        persistActiveTrial,
        reusableTrials,
        tokenController,
      });
      return trialExecution.recordedTrial;
    },
    repositoryRoot: REPOSITORY_ROOT,
    workerCount,
  });

  if (!arguments_.isRecordRequested) {
    if (checkpointMode === 'diagnostic') {
      await rm(getSemanticCheckpointPath(REPOSITORY_ROOT), { force: true });
    }
    process.stdout.write(
      `${JSON.stringify(recordedCases.map(({ id, status }) => ({ id, status })))}\n`,
    );
    if (recordedCases.some(({ status }) => status === 'failed')) process.exitCode = 1;
    return;
  }
  const result = await recordSemanticAttempt({
    actorHost,
    artifactDigest,
    attemptId,
    cases: recordedCases,
    caseSuiteDigest,
    cli,
    coverage,
    coverageDigest,
    createdAt,
    definitions: selectedCases,
    judgeHost,
  });
  await rm(getSemanticCheckpointPath(REPOSITORY_ROOT), { force: true });
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.status !== 'passed') process.exitCode = 1;
};

const isDirectExecution =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  try {
    await run();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
