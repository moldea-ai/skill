import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm, statfs } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hashValue } from 'jg-crypto';
import { createShutdownSignal, isMainModule } from 'jg-process';

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
  CodexEvaluationHostError,
  CODEX_EVALUATION_HOST_FAILURE_KINDS,
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
  createRecordedSemanticDefinitions,
  createSemanticCaseDefinitionDigest,
  loadSemanticCases,
  type ISemanticCase,
} from '../cases/index.ts';
import {
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingCaseRepairGitEvidence,
  hasPassingSemanticResultDimensions,
  isSemanticConfirmationEligible,
  parseSemanticEvaluationHostOutput,
  summarizeSemanticCycles,
  type ISemanticHostOutput,
  type ISemanticCycleEvidence,
  type ISemanticPaidInvocation,
} from '../execution/index.ts';
import {
  createSemanticEvidenceBundle,
  type ISemanticAttemptRecord,
  type ISemanticAttemptTrialModel,
  type ISemanticCliIdentity,
} from '../public-evidence/index.ts';
import {
  archiveSemanticDiagnosticCheckpoint,
  appendSemanticOperationalRetry,
  attachSemanticActorEvidence,
  completeSemanticActiveTrial,
  createSemanticActiveTrial,
  createSemanticTokenAdmissionController,
  createSemanticReplay,
  SEMANTIC_EVIDENCE_SCHEMA_VERSION,
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
  createSemanticHostContract,
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
import { runSemanticActorSession } from './actor-session/index.ts';
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
  tokenLimit?: number;
  signal?: AbortSignal | undefined;
  workerCount: IEvaluationBatchWorkerCount;
};

const createAttemptId = (): string =>
  `sem-${new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/gu, '')
    .slice(0, 17)}-${randomUUID().replaceAll('-', '').slice(0, 8)}`;

/**
 * Retains every completed diagnostic trial before removing its active checkpoint.
 * @returns The private completed archive path.
 * @throws
 * - Semantic diagnostic attempt identity is not a safe archive component.
 * - Semantic diagnostic archive requires a complete terminal selection.
 */
export const completeSemanticDiagnostic = async (
  repositoryRoot: string,
  checkpoint: ISemanticCandidateCheckpoint,
): Promise<string> => {
  const archivePath = await archiveSemanticDiagnosticCheckpoint(repositoryRoot, checkpoint);
  await rm(getSemanticCheckpointPath(repositoryRoot), { force: true });
  return archivePath;
};

const createJsonSha256 = (input: unknown): string => hashValue(`${JSON.stringify(input)}\n`);

const addJsonOutput = (command: readonly string[], role: 'actor' | 'judge'): string[] => {
  const completeCommand = buildCodexEvaluationHostCommand(command, role);
  return completeCommand.includes('--json')
    ? completeCommand
    : [...completeCommand.slice(0, -1), '--json', '-'];
};

const serializeWorkspaceSnapshot = (
  snapshot: Awaited<ReturnType<typeof snapshotSemanticWorkspace>>,
): Array<{ path: string; state: unknown }> =>
  [...snapshot.entries()]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([snapshotPath, state]) => ({ path: snapshotPath, state }));

const getCompletedActorCycles = (
  invocations: readonly ISemanticPaidInvocation[],
): ISemanticCycleEvidence[] =>
  invocations.flatMap(({ cycle }) => (cycle === undefined ? [] : [cycle]));

/**
 * Stops before setup or another paid boundary, using the existing aborted-host contract.
 * @throws Evaluation host execution was aborted.
 */
const throwIfSemanticExecutionAborted = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted)
    throw new CodexEvaluationHostError(
      CODEX_EVALUATION_HOST_FAILURE_KINDS.Aborted,
      'Evaluation host execution was aborted.',
    );
};

const runHostStage = async <T>(options: {
  activeTrial: ISemanticActiveTrialCheckpoint;
  isOperationalResumeRequested: boolean;
  operation: (
    signal: AbortSignal,
    invoke: (operation: () => Promise<ISemanticHostOutput>) => Promise<ISemanticHostOutput>,
    persistCycles: (cycles: ISemanticCycleEvidence[]) => Promise<void>,
  ) => Promise<T>;
  persistActiveTrial: (activeTrial: ISemanticActiveTrialCheckpoint) => Promise<void>;
  reservationId: string;
  stage: 'actor' | 'judge';
  signal?: AbortSignal | undefined;
  temporaryRoot: string;
  tokenController: ISemanticTokenAdmissionController;
}): Promise<{
  activeTrial: ISemanticActiveTrialCheckpoint;
  output: T;
}> => {
  let activeTrial = options.activeTrial;
  throwIfSemanticExecutionAborted(options.signal);
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
  const releaseReservation = (): void => {
    if (!isReservationActive) return;
    options.tokenController.release(options.reservationId);
    isReservationActive = false;
  };
  try {
    const output = await runWithEvaluationTemporaryStorageGuard(
      options.temporaryRoot,
      (storageSignal) => {
        const signal =
          options.signal === undefined
            ? storageSignal
            : AbortSignal.any([storageSignal, options.signal]);
        return runCodexEvaluationOperationalStage({
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
            releaseReservation();
          },
          onRetry: async (retry) => {
            activeTrial = appendSemanticOperationalRetry(activeTrial, options.stage, retry);
            await options.persistActiveTrial(activeTrial);
            releaseReservation();
          },
          operation: async () =>
            options.operation(
              signal,
              async (operation) => {
                throwIfSemanticExecutionAborted(signal);
                options.tokenController.reserve(options.reservationId);
                isReservationActive = true;
                const invocationIndex = activeTrial.paidInvocations.length;
                activeTrial = {
                  ...activeTrial,
                  paidInvocations: [
                    ...activeTrial.paidInvocations,
                    { stage: options.stage, usage: null },
                  ],
                };
                try {
                  // Durable unknown usage owns the reservation before the process can start.
                  await options.persistActiveTrial(activeTrial);
                } finally {
                  releaseReservation();
                }
                throwIfSemanticExecutionAborted(signal);
                const output = await operation();
                activeTrial = {
                  ...activeTrial,
                  paidInvocations: activeTrial.paidInvocations.map((invocation, index) =>
                    index === invocationIndex
                      ? {
                          ...invocation,
                          usage: output.usage,
                          commandPolicyEvidence: output.commandPolicyEvidence,
                        }
                      : invocation,
                  ),
                };
                await options.persistActiveTrial(activeTrial);
                return output;
              },
              async (cycles) => {
                const cycle = cycles.at(-1);
                activeTrial = {
                  ...activeTrial,
                  actorCycles: cycles,
                  paidInvocations: activeTrial.paidInvocations.map((invocation, index) =>
                    cycle !== undefined && index === activeTrial.paidInvocations.length - 1
                      ? { ...invocation, cycle }
                      : invocation,
                  ),
                };
                await options.persistActiveTrial(activeTrial);
              },
            ),
          signal,
        });
      },
    );
    return { activeTrial, output };
  } catch (error) {
    releaseReservation();
    throw error;
  }
};

/**
 * Executes one isolated actor session and its independently assessed durable trial.
 * @returns The complete private trial and its public projection.
 * @throws If execution is cancelled, or checkpoint identity, bounded execution, paid admission or durable persistence fails.
 */
export const runSemanticTrial = async (options: {
  activeTrial: ISemanticActiveTrialCheckpoint | null;
  actorCommand: readonly string[];
  actorHost: ICodexEvaluationHostIdentity;
  caseDefinition: ISemanticCase;
  cli: ISemanticCliIdentity;
  confirmationIndex: 1 | 2 | 3 | null;
  artifactDigest: string;
  privateTraceAttemptId?: string;
  isOperationalResumeRequested: boolean;
  judgeCommand: readonly string[];
  judgeHost: ICodexEvaluationHostIdentity;
  persistActiveTrial: (activeTrial: ISemanticActiveTrialCheckpoint) => Promise<void>;
  reusableTrials: readonly ISemanticReusableTrial[];
  tokenController: ISemanticTokenAdmissionController;
  signal?: AbortSignal | undefined;
}): Promise<ISemanticTrialExecution> => {
  throwIfSemanticExecutionAborted(options.signal);
  const evaluationRoot = await mkdtemp(
    path.join(tmpdir(), `moldea-semantic-${options.caseDefinition.id}-`),
  );
  try {
    const actorHome = path.join(evaluationRoot, 'actor-home');
    const actorToolDirectory = path.join(evaluationRoot, 'actor-tools');
    const { developerDirection, hasWorkspaceBinaryDirectory, readOnlyMounts, repositoryPath } =
      await createActorRepository(
        evaluationRoot,
        options.caseDefinition,
        actorHome,
        actorToolDirectory,
      );
    const beforeWorkspace = await snapshotSemanticWorkspace(repositoryPath);
    const relatedMounts = readOnlyMounts.filter(({ target }) => target !== '/home/evaluator/bin');
    const relatedBefore = await Promise.all(
      relatedMounts.map(async ({ source }) => snapshotSemanticWorkspace(source)),
    );
    const preparedCase = {
      ...options.caseDefinition,
      input: { ...options.caseDefinition.input, developerDirection },
    };
    const actorPrompt = buildSemanticActorPrompt(preparedCase);
    const caseDefinitionDigest = createSemanticCaseDefinitionDigest(options.caseDefinition);
    const actorStageIdentity = createSemanticActorStageIdentity({
      actorCommand: options.actorCommand,
      actorHost: options.actorHost,
      actorPrompt,
      ...(preparedCase.input.followUpDeveloperRequests === undefined
        ? {}
        : { followUpDeveloperRequests: preparedCase.input.followUpDeveloperRequests }),
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
        cycles: recordedTrial.cycles,
        interruptedActorCycles: getCompletedActorCycles(recordedTrial.paidInvocations).slice(
          0,
          -recordedTrial.cycles.length,
        ),
        actorCommandPolicyEvidence: recordedTrial.trial.actorCommandPolicyEvidence,
        actorExecutionEvidence: recordedTrial.actorExecutionEvidence,
        gitInvocationEvidence: recordedTrial.gitInvocationEvidence,
        actorResourceEvidence: recordedTrial.trial.actorResourceEvidence,
        actorResponse: recordedTrial.actorResponse,
        isRepositoryControlPassing: recordedTrial.trial.dimensions.repositoryControl,
        caseDefinition: preparedCase,
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

    // the unchanged-failure stop also applies to a resumed pending stage
    const reusableTrial = selectSemanticReusableTrial({
      activeTrial: options.activeTrial,
      actorIdentitySha256: actorStageIdentity.sha256,
      candidates: options.reusableTrials,
      caseId: options.caseDefinition.id,
      confirmationIndex: options.confirmationIndex,
      judgeIdentitySha256: (candidate) => createJudgeIdentity(candidate.recordedTrial).sha256,
    });
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
            cycles: recordedTrial.cycles,
            actorExecutionEvidence: recordedTrial.actorExecutionEvidence,
            gitInvocationEvidence: recordedTrial.gitInvocationEvidence,
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
      let hasStartedAttempt = false;
      const actorExecution = await runHostStage({
        activeTrial,
        signal: options.signal,
        isOperationalResumeRequested: options.isOperationalResumeRequested,
        operation: async (signal, invoke, persistCycles) => {
          if (hasStartedAttempt) {
            await Promise.all(
              [repositoryPath, actorHome, actorToolDirectory].map((ownedPath) =>
                rm(ownedPath, { force: true, recursive: true }),
              ),
            );
            const recreated = await createActorRepository(
              evaluationRoot,
              options.caseDefinition,
              actorHome,
              actorToolDirectory,
            );
            const recreatedWorkspace = await snapshotSemanticWorkspace(repositoryPath);
            const recreatedMounts = await Promise.all(
              relatedMounts.map(({ source }) => snapshotSemanticWorkspace(source)),
            );
            if (
              recreated.developerDirection !== developerDirection ||
              recreated.hasWorkspaceBinaryDirectory !== hasWorkspaceBinaryDirectory ||
              JSON.stringify(recreated.readOnlyMounts) !== JSON.stringify(readOnlyMounts) ||
              JSON.stringify(serializeWorkspaceSnapshot(recreatedWorkspace)) !==
                JSON.stringify(serializeWorkspaceSnapshot(beforeWorkspace)) ||
              recreatedMounts.some(
                (snapshot, index) =>
                  JSON.stringify(serializeWorkspaceSnapshot(snapshot)) !==
                  JSON.stringify(
                    serializeWorkspaceSnapshot(
                      relatedBefore[index] ?? EMPTY_SEMANTIC_WORKSPACE_SNAPSHOT,
                    ),
                  ),
              )
            )
              throw new Error('Restarted actor fixture does not match its frozen stage identity.');
          }
          hasStartedAttempt = true;
          await persistCycles([]);
          const completedCycles: ISemanticCycleEvidence[] = [];
          return runSemanticActorSession({
            cli: options.cli,
            host: {
              command: options.actorCommand,
              cwd: repositoryPath,
              includeWorkspaceBinaryDirectory: hasWorkspaceBinaryDirectory,
              ...(options.privateTraceAttemptId === undefined
                ? {}
                : {
                    privateTrace: {
                      repositoryRoot: REPOSITORY_ROOT,
                      attemptId: options.privateTraceAttemptId,
                      caseId: options.caseDefinition.id,
                      invocation: `t${options.confirmationIndex ?? 0}-a`,
                    },
                  }),
              readOnlyMounts,
              readOnlyWorkspacePaths: ['.agents', '.git'],
              sandboxHome: actorHome,
              signal,
            },
            invoke,
            persistCycle: async (cycle) => {
              completedCycles.push(cycle);
              await persistCycles([...completedCycles]);
            },
            requests: [actorPrompt, ...(preparedCase.input.followUpDeveloperRequests ?? [])],
          });
        },
        persistActiveTrial: options.persistActiveTrial,
        reservationId: options.caseDefinition.id,
        stage: 'actor',
        temporaryRoot: evaluationRoot,
        tokenController: options.tokenController,
      });
      activeTrial = actorExecution.activeTrial;
      const cycles = actorExecution.output;
      activeTrial = attachSemanticActorEvidence(
        activeTrial,
        {
          ...summarizeSemanticCycles(cycles),
          cycles,
          actorStageIdentitySha256: actorStageIdentity.sha256,
          isMountIntegrityPassing: cycles.every((cycle) => cycle.isMountIntegrityPassing),
          isRepositoryControlPassing: cycles.every((cycle) => cycle.isRepositoryControlPassing),
          workspaceChanges: diffSemanticWorkspaceSnapshots(
            beforeWorkspace,
            await snapshotSemanticWorkspace(repositoryPath),
          ),
        },
        new Date().toISOString(),
      );
      await options.persistActiveTrial(activeTrial);
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
      cycles: actorEvidence.cycles,
      interruptedActorCycles: getCompletedActorCycles(activeTrial.paidInvocations).slice(
        0,
        -actorEvidence.cycles.length,
      ),
      actorCommandPolicyEvidence: actorEvidence.commandPolicyEvidence,
      actorExecutionEvidence: actorEvidence.actorExecutionEvidence,
      gitInvocationEvidence: actorEvidence.gitInvocationEvidence,
      actorResourceEvidence: actorEvidence.actorResourceEvidence,
      actorResponse: actorEvidence.response,
      isRepositoryControlPassing: actorEvidence.isRepositoryControlPassing,
      caseDefinition: preparedCase,
      repositoryEvidence: options.caseDefinition.input.repositoryEvidence,
      workspaceChanges: actorEvidence.workspaceChanges,
    });
    const judgeExecution = await runHostStage({
      activeTrial,
      signal: options.signal,
      isOperationalResumeRequested: options.isOperationalResumeRequested,
      operation: async (signal, invoke) => {
        const judgeEvidence = await invoke(async () => {
          const output = await runCodexEvaluationHost({
            command: options.judgeCommand,
            cwd: repositoryPath,
            prompt: judgePrompt,
            ...(options.privateTraceAttemptId === undefined
              ? {}
              : {
                  privateTrace: {
                    repositoryRoot: REPOSITORY_ROOT,
                    attemptId: options.privateTraceAttemptId,
                    caseId: options.caseDefinition.id,
                    invocation: `t${options.confirmationIndex ?? 0}-j`,
                  },
                }),
            readOnlyMounts: relatedMounts,
            readOnlyWorkspacePaths: ['.agents', '.git'],
            role: 'judge',
            sandboxHome: judgeHome,
            signal,
            workspaceAccess: 'read-only',
          });
          return parseSemanticEvaluationHostOutput(output, {
            cliVersion: options.cli.version,
            jsonSchemaVersion: options.cli.jsonSchemaVersion,
          });
        });
        return {
          judgeEvidence,
          assessment: assessSemanticJudgeOutput(options.caseDefinition, judgeEvidence.response),
        };
      },
      persistActiveTrial: options.persistActiveTrial,
      reservationId: options.caseDefinition.id,
      stage: 'judge',
      temporaryRoot: evaluationRoot,
      tokenController: options.tokenController,
    });
    activeTrial = judgeExecution.activeTrial;
    const { judgeEvidence, assessment } = judgeExecution.output;
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
    const dimensions = createSemanticResultDimensions({
      cycles: actorEvidence.cycles,
      paidInvocations: activeTrial.paidInvocations,
      actorCommandPolicy: actorEvidence.commandPolicyEvidence,
      actorExecutionEvidence: actorEvidence.actorExecutionEvidence,
      gitInvocationEvidence: actorEvidence.gitInvocationEvidence,
      actorResourceEvidence: actorEvidence.actorResourceEvidence,
      caseDefinition: options.caseDefinition,
      isMountIntegrityPassing: actorEvidence.isMountIntegrityPassing,
      isRepositoryControlPassing: actorEvidence.isRepositoryControlPassing,
      isSemanticPassing: assessment.isPassed,
      judgeCommandPolicy: judgeEvidence.commandPolicyEvidence,
    });
    const evaluatedAt = new Date().toISOString();
    const publicTrial: ISemanticAttemptTrialModel = {
      cycles: actorEvidence.cycles,
      paidInvocations: activeTrial.paidInvocations,
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
      rationale: [
        assessment.rationale,
        ...(dimensions.commandPolicy
          ? []
          : ['Deterministic host security-policy evidence did not pass.']),
        ...(hasPassingCaseRepairGitEvidence({
          actorCommandPolicy: actorEvidence.commandPolicyEvidence,
          actorExecutionEvidence: actorEvidence.actorExecutionEvidence,
          gitInvocationEvidence: actorEvidence.gitInvocationEvidence,
          caseDefinition: options.caseDefinition,
        })
          ? []
          : [
              'Deterministic repair-Git evidence did not pass; complete compliant observations are required.',
            ]),
      ].join(' '),
      stageReuse: null,
    };
    const recordedTrial: ISemanticRecordedTrial = {
      cycles: actorEvidence.cycles,
      paidInvocations: activeTrial.paidInvocations,
      actorExecutionEvidence: actorEvidence.actorExecutionEvidence,
      gitInvocationEvidence: actorEvidence.gitInvocationEvidence,
      actorResponse: actorEvidence.response,
      developerDirection: actorPrompt,
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
 * - Semantic token limit must be a positive safe integer no greater than 128000000.
 * - Paid-stage admission exceeds the configured limit.
 * - Execution is cancelled before another case or paid boundary.
 */
export const executeSemanticCases = async (
  options: ISemanticCaseRunnerOptions,
): Promise<ISemanticRecordedCase[]> => {
  throwIfSemanticExecutionAborted(options.signal);
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
    ...(options.tokenLimit === undefined ? {} : { tokenLimit: options.tokenLimit }),
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
    executeTrial: (trialOptions) => {
      throwIfSemanticExecutionAborted(options.signal);
      return options.executeTrial({ ...trialOptions, tokenController });
    },
    signal: options.signal,
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
      schemaVersion: SEMANTIC_EVIDENCE_SCHEMA_VERSION,
      sha256: options.evidenceSha256,
    },
    executedStageCount: options.cases.reduce(
      (count, entry) =>
        count +
        entry.trials
          .filter(({ trial }) => trial.executionOrigin === 'executed')
          .reduce((total, recorded) => total + recorded.paidInvocations.length, 0),
      0,
    ),
    executedTrialCount: caseResults.reduce(
      (count, entry) =>
        count + entry.trials.filter(({ executionOrigin }) => executionOrigin === 'executed').length,
      0,
    ),
    failedCaseCount,
    hostContract: {
      actor: {
        ...createSemanticHostContract(options.actorHost),
        role: 'actor',
      },
      judge: {
        ...createSemanticHostContract(options.judgeHost),
        role: 'judge',
      },
    },
    passedCaseCount: caseResults.filter(({ status }) => status === 'passed').length,
    pendingCaseCount,
    recordedAt: updatedAt,
    recoveredCaseCount: caseResults.filter(({ status }) => status === 'recovered').length,
    reusedStageCount: options.cases.reduce(
      (count, entry) =>
        count +
        entry.trials
          .filter(({ trial }) => trial.executionOrigin === 'reused')
          .reduce((total, recorded) => total + recorded.cycles.length + 1, 0),
      0,
    ),
    reusedTrialCount: caseResults.reduce(
      (count, entry) =>
        count + entry.trials.filter(({ executionOrigin }) => executionOrigin === 'reused').length,
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
  const evidenceRecord = { cases: options.cases, schemaVersion: SEMANTIC_EVIDENCE_SCHEMA_VERSION };
  const evidenceSha256 = createJsonSha256(evidenceRecord);
  const result = createAttemptRecord({ ...options, evidenceSha256 });
  const replays = new Map<string, IEvaluationReplayModel>(
    options.cases.map((recordedCase) => [recordedCase.id, createSemanticReplay(recordedCase)]),
  );
  const attemptPath = `.evidence/semantic/results/attempts/${options.attemptId}/attempt.json`;
  const evidencePath = `.evidence/semantic/results/attempts/${options.attemptId}/evidence.json`;
  const requestsByCase = new Map(
    options.cases.map(({ id, trials }) => [id, trials[0]?.developerDirection]),
  );
  const bundle = createSemanticEvidenceBundle({
    artifacts: [
      {
        content: Buffer.from(`${JSON.stringify(result, null, 2)}\n`),
        mediaType: 'application/json',
        path: attemptPath,
      },
      {
        content: Buffer.from(`${JSON.stringify(evidenceRecord)}\n`),
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
    definitions: createRecordedSemanticDefinitions(options.definitions, requestsByCase),
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

const run = async (signal: AbortSignal): Promise<void> => {
  throwIfSemanticExecutionAborted(signal);
  const arguments_ = parseSemanticEvaluationArguments(process.argv.slice(2));
  const catalog = await loadSemanticCases(CASES_ROOT);
  const cases = arguments_.isRecordRequested
    ? catalog.filter(({ publication }) => publication !== 'private')
    : catalog;
  const coverage = createSemanticCoverage(cases);
  const artifactDigest = createPortableSkillArtifactDigest(REPOSITORY_ROOT);
  const caseSuiteDigest = createSemanticCaseSuiteDigest(cases);
  const coverageDigest = createSemanticCoverageDigest(coverage);
  const cli = createSemanticCliIdentity(REPOSITORY_ROOT);

  if (arguments_.isPreflightRequested) {
    for (const caseDefinition of cases) buildSemanticActorPrompt(caseDefinition);
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
  } else if (arguments_.recordCaseIds !== null) {
    const ids = new Set(arguments_.recordCaseIds);
    selectedCases = cases.filter(({ id }) => ids.has(id));
    if (selectedCases.length !== ids.size) throw new Error('Unknown semantic recording case id.');
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
        actorHost: createSemanticHostContract(actorHost),
        artifactDigest,
        caseSuiteDigest,
        cli,
        coverageDigest,
        judgeHost: createSemanticHostContract(judgeHost),
        mode: checkpointMode,
        selectedCaseIds,
      };
      const actualIdentity = {
        actorHost: createSemanticHostContract(checkpoint.actorHost),
        artifactDigest: checkpoint.artifactDigest,
        caseSuiteDigest: checkpoint.caseSuiteDigest,
        cli: checkpoint.cli,
        coverageDigest: checkpoint.coverageDigest,
        judgeHost: createSemanticHostContract(checkpoint.judgeHost),
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
      schemaVersion: 4,
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
    signal,
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
        signal,
        activeTrial,
        actorCommand,
        actorHost,
        artifactDigest,
        privateTraceAttemptId: attemptId,
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
    ...(arguments_.tokenLimit === null ? {} : { tokenLimit: arguments_.tokenLimit }),
    workerCount,
  });

  throwIfSemanticExecutionAborted(signal);
  if (!arguments_.isRecordRequested) {
    if (checkpointMode === 'diagnostic') {
      if (checkpoint === null) throw new Error('Completed semantic diagnostic has no checkpoint.');
      await completeSemanticDiagnostic(REPOSITORY_ROOT, checkpoint);
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

if (isMainModule(import.meta.url)) {
  const shutdown = createShutdownSignal({ forceOnRepeat: true });
  try {
    await run(shutdown.signal);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    if (!shutdown.signal.aborted) process.exitCode = 1;
  } finally {
    shutdown.dispose();
  }
}
