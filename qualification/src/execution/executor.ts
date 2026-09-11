import { randomUUID } from 'node:crypto';
import { access, rm } from 'node:fs/promises';
import path from 'node:path';

import { CodexEvaluationOperationalRetryExhaustedError } from '../../../tooling/codex-evaluation-host/index.mjs';
import {
  EVALUATION_BATCH_DEFAULT_WORKER_COUNT,
  runOrderedEvaluationBatch,
} from '../../../tooling/evaluation-batch/index.mjs';
import { getEvaluationConfirmationResolution } from '../../../tooling/evaluation-confirmation-policy/index.mjs';

import { prepareCandidateClosure } from '../candidate-closure/index.ts';
import {
  calculateQualificationBaselineDigestAtCommit,
  inspectQualificationBaseline,
  QualificationBaselineCheckSchema,
} from '../baseline/index.ts';
import {
  appendQualificationOperationalRetry,
  appendQualificationOperationalStop,
  createAttemptCheckpoint,
  normalizeInterruptedCheckpoint,
  readAttemptCheckpoint,
  resumeQualificationOperationalStop,
  skipQualificationStageGroup,
  writeAttemptCheckpoint,
} from '../checkpoint/index.ts';
import {
  loadRuntimeCompatibilitySnapshot,
  resolveQualificationTarget,
  type IResolvedQualificationTarget,
} from '../compatibility/index.ts';
import {
  DEFAULT_PACKAGES_REPOSITORY,
  DEFAULT_SKILL_REPOSITORY,
  QUALIFICATION_CANDIDATE_TOKEN_LIMIT,
  QUALIFICATION_CONFIRMATION_POLICY,
  QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES,
  QUALIFICATION_RESULTS_ROOT,
  SKILL_REPOSITORY_ROOT,
} from '../constants/index.ts';
import {
  DeterministicVerificationArtifactSchema,
  QualificationAttemptCheckpointSchema,
  QualificationCaseResultSchema,
  QualificationJudgeSkippedSchema,
  QualificationOperationalStopSchema,
  QualificationSourceStateResultSchema,
  QualificationTrialResultSchema,
  WorkspaceAssertionResultSchema,
  type IQualificationAttemptCheckpoint,
  type IQualificationAttemptResult,
  type IQualificationCaseResult,
  type IQualificationProfileCase,
  type IQualificationTrialResult,
} from '../contracts/index.ts';
import {
  inspectQualificationCoverage,
  QualificationCoverageResultSchema,
} from '../coverage/index.ts';
import { verifyDeterministicProject } from '../deterministic/index.ts';
import {
  calculateQualificationCaseModelInputDigests,
  calculateQualificationModelStageEvaluatorDigest,
} from '../evidence-identity/index.ts';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import {
  captureQualificationProjectSnapshot,
  captureWorkspacePatch,
  inspectWorkspaceAssertions,
  prepareQualificationProject,
  readQualificationTask,
  restoreQualificationProjectSnapshot,
} from '../project-fixture/index.ts';
import { inspectGitRepositoryState } from '../repository-state/index.ts';
import {
  loadReusableQualificationCases,
  materializeReusableQualificationCase,
  type IReusableQualificationCase,
} from '../reuse/index.ts';
import {
  recordQualificationResult,
  sanitizeEvidenceText,
  sanitizeEvidenceValue,
} from '../result/index.ts';
import { getLocalAttemptDirectory } from './attempts.ts';
import { cleanupQualificationAttemptRuntime } from './attempt-runtime.ts';
import {
  calculatePackagesQualificationDigest,
  calculateQualificationExecutionDigest,
} from './fingerprints.ts';
import {
  executeActorModelStage,
  executeJudgeModelStage,
  restoreActorModelStage,
  restoreJudgeModelStage,
} from './model-stages.ts';
import {
  createQualificationExecutionProvenance,
  inspectQualificationExecutionEnvironment,
} from './provenance.ts';
import {
  assertQualificationBatchDiskAdmission,
  runWithQualificationTemporaryStorageGuard,
} from './resources.ts';
import {
  completeQualificationStage,
  createQualificationStageIds,
  createQualificationTrialStageIds,
  getQualificationMaximumCallCount,
  getQualificationMaximumTokenCount,
  getQualificationPlannedCallCount,
  isQualificationStageComplete,
  QualificationCandidateTokenLimitError,
  reserveQualificationCandidateTokens,
  setQualificationStageIdentity,
  settleQualificationCandidateTokens,
  startQualificationStage,
} from './stages.ts';
import { createQualificationAttemptResult } from './transformers.ts';
import { createQualificationBatchTokenController } from './token-admission.ts';
import {
  createRunnerRequirementAssessments,
  deriveQualificationCommandPolicyFailures,
  haveCandidateClosuresChanged,
  haveQualificationExecutionInputsChanged,
  haveQualificationInputsChanged,
  inspectQualificationResourceUsage,
  inspectQualificationSourceState,
  mergeQualificationRequirementAssessments,
} from './validations.ts';
import type {
  IQualificationExecutionProvenance,
  IQualificationInputState,
  IQualificationRunOutcome,
  IRunQualificationOptions,
} from './types.ts';

// internal control-flow signal for a declined or unavailable paid-execution approval
class PaidExecutionApprovalError extends Error {}

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Captures the immutable behavior-bearing repositories for one qualification target.
 * @returns The package, qualification-suite, and portable-skill repository states.
 */
export const inspectQualificationInputState = async (
  packagesState: IQualificationInputState['packagesState'],
  skillRepository: string,
  target: IResolvedQualificationTarget,
): Promise<IQualificationInputState> => {
  const caseIds = target.profile.cases.map(({ id }) => id);
  const [caseDigests, evaluatorStageDigest, qualificationDigest, qualificationState, skillState] =
    await Promise.all([
      calculateQualificationCaseModelInputDigests({ caseIds, selection: target.selection }),
      calculateQualificationModelStageEvaluatorDigest(),
      calculateQualificationExecutionDigest({
        caseIds,
        profileDirectory: target.profileDirectory,
      }),
      inspectGitRepositoryState(SKILL_REPOSITORY_ROOT, {
        includedRelativePathPrefixes: QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES,
        excludedRelativePathPrefixes: ['qualification/results'],
      }),
      inspectGitRepositoryState(skillRepository),
    ]);
  const packagesDigest = calculatePackagesQualificationDigest({
    adapter: target.adapter,
    matrixVersion: target.matrix.version,
    target: target.target,
  });
  const qualificationBaselineDigest = await calculateQualificationBaselineDigestAtCommit(
    qualificationState.commit,
  );

  return {
    caseDigests,
    evaluatorStageDigest,
    packagesDigest,
    packagesState,
    qualificationBaselineDigest,
    qualificationDigest,
    qualificationState,
    skillState,
  };
};

const createAttemptId = (adapterId: string, implementationId: string): string => {
  const timestamp = new Date().toISOString().replace(/[-:.]/gu, '');
  return `${timestamp}-${adapterId}-${implementationId}-${randomUUID().slice(0, 8)}`;
};

const persistFinalState = async (options: {
  attemptDirectory: string;
  caseResults: IQualificationCaseResult[];
  checkpoint: IQualificationAttemptCheckpoint;
  provenance: IQualificationExecutionProvenance;
  stageIds: readonly string[];
  status: 'errored' | 'failed' | 'incomplete' | 'passed';
  summary: string;
}): Promise<{
  checkpoint: IQualificationAttemptCheckpoint;
  result: IQualificationAttemptResult;
}> => {
  const completedAt = options.status === 'incomplete' ? null : new Date().toISOString();
  const checkpoint = QualificationAttemptCheckpointSchema.parse({
    ...options.checkpoint,
    status: options.status,
    completedAt,
    updatedAt: new Date().toISOString(),
  });
  await writeAttemptCheckpoint(options.attemptDirectory, checkpoint);
  const result = createQualificationAttemptResult({
    caseResults: options.caseResults,
    checkpoint,
    completedAt,
    provenance: options.provenance,
    status: options.status,
    summary: options.summary,
    stageIds: options.stageIds,
  });
  await writeJsonFileAtomically(path.join(options.attemptDirectory, 'result-draft.json'), result);
  return { checkpoint, result };
};

const prepareAttempt = async (options: IRunQualificationOptions) => {
  if (options.resumeAttemptId !== undefined) {
    const attemptDirectory = getLocalAttemptDirectory(options.resumeAttemptId);
    const rawCheckpoint = await readAttemptCheckpoint(attemptDirectory);

    if (rawCheckpoint.status !== 'incomplete' && rawCheckpoint.status !== 'running') {
      throw new Error(
        `Attempt ${rawCheckpoint.attemptId} is ${rawCheckpoint.status}; use retry for terminal attempts.`,
      );
    }

    if (rawCheckpoint.recordedAt !== null) {
      throw new Error(
        `Attempt ${rawCheckpoint.attemptId} was recorded as immutable incomplete evidence; retry it with a new attempt identity.`,
      );
    }

    const hasStoppedStage = Object.values(rawCheckpoint.stages).some(
      ({ status }) => status === 'stopped',
    );
    const hasInterruptedStoppedStageResume = Object.values(rawCheckpoint.stages).some(
      (stage) =>
        stage.hasUsedOperationalStopResume &&
        stage.operationalStops.length === 1 &&
        (stage.status === 'pending' || stage.status === 'running'),
    );

    if (hasInterruptedStoppedStageResume) {
      throw new Error(
        'The one explicit stopped-stage resume was interrupted and cannot launch again.',
      );
    }

    if (hasStoppedStage !== (options.resumeStoppedStage === true)) {
      throw new Error(
        hasStoppedStage
          ? 'Attempt has a terminally stopped stage; resume requires --resume-stopped-stage.'
          : 'Attempt has no terminally stopped stage to resume explicitly.',
      );
    }

    const checkpoint = hasStoppedStage
      ? resumeQualificationOperationalStop(rawCheckpoint)
      : normalizeInterruptedCheckpoint(rawCheckpoint);
    await writeAttemptCheckpoint(attemptDirectory, checkpoint);
    return { attemptDirectory, checkpoint, isResume: true };
  }

  if (options.selection === undefined) {
    throw new Error(
      'A new qualification attempt requires an adapter and implementation selection.',
    );
  }

  const packagesRepository = path.resolve(
    options.packagesRepository ?? DEFAULT_PACKAGES_REPOSITORY,
  );
  const compatibilitySnapshot = await loadRuntimeCompatibilitySnapshot(packagesRepository);
  const target = await resolveQualificationTarget(
    options.selection,
    packagesRepository,
    compatibilitySnapshot.matrix,
  );
  const mode = options.mode ?? (options.isDryRun === true ? 'dry-run' : 'official');
  const selectedCaseId = mode === 'diagnostic' ? options.caseId : undefined;

  if (mode === 'diagnostic' && selectedCaseId === undefined) {
    throw new Error('A diagnostic qualification attempt requires a case id.');
  }
  if (mode !== 'diagnostic' && options.caseId !== undefined) {
    throw new Error('Only a diagnostic qualification attempt can select one case.');
  }
  if (
    selectedCaseId !== undefined &&
    !target.profile.cases.some(({ id }) => id === selectedCaseId)
  ) {
    throw new Error(`Qualification profile does not contain case ${selectedCaseId}.`);
  }
  const selectedCases =
    selectedCaseId === undefined
      ? target.profile.cases
      : target.profile.cases.filter(({ id }) => id === selectedCaseId);
  const skillRepository = path.resolve(options.skillRepository ?? DEFAULT_SKILL_REPOSITORY);
  const initialCandidateTokensConsumed = options.initialCandidateTokensConsumed ?? 0;

  if (
    !Number.isSafeInteger(initialCandidateTokensConsumed) ||
    initialCandidateTokensConsumed < 0 ||
    initialCandidateTokensConsumed > QUALIFICATION_CANDIDATE_TOKEN_LIMIT
  ) {
    throw new Error(
      `Initial qualification candidate token consumption must be an integer from 0 through ${QUALIFICATION_CANDIDATE_TOKEN_LIMIT}.`,
    );
  }

  if (!(await pathExists(path.join(skillRepository, 'SKILL.md')))) {
    throw new Error(`Candidate skill directory does not contain SKILL.md: ${skillRepository}`);
  }

  const inputState = await inspectQualificationInputState(
    compatibilitySnapshot.repositoryState,
    skillRepository,
    target,
  );
  const executionEnvironment = await inspectQualificationExecutionEnvironment(options.host);
  const attemptId =
    options.newAttemptId ??
    createAttemptId(options.selection.adapterId, options.selection.implementationId);
  const attemptDirectory = getLocalAttemptDirectory(attemptId);

  if (await pathExists(path.join(attemptDirectory, 'checkpoint.json'))) {
    throw new Error(`Qualification attempt ${attemptId} already exists.`);
  }
  const checkpoint = await createAttemptCheckpoint({
    attemptDirectory,
    attemptId,
    parentAttemptId: options.parentAttemptId ?? null,
    selection: options.selection,
    isDryRun: mode === 'dry-run',
    mode,
    selectedCaseId: selectedCaseId ?? null,
    reuseEvidence: options.reuseEvidence ?? true,
    packagesRepository,
    skillRepository,
    profileDigest: target.profileDigest,
    qualificationDigest: inputState.qualificationDigest,
    skillDigest: inputState.skillState.fingerprint,
    packagesRepositoryFingerprint: inputState.packagesState.fingerprint,
    packagesDigest: inputState.packagesDigest,
    targetDigest: target.targetDigest,
    executionEnvironment,
    initialCandidateTokensConsumed,
    stageIds: createQualificationStageIds(
      selectedCases.map(({ id }) => id),
      mode !== 'diagnostic',
    ),
  });

  return { attemptDirectory, checkpoint, isResume: false };
};

/** Runs or resumes one local qualification attempt with atomic evidence after every stage. */
export const runQualification = async (
  options: IRunQualificationOptions,
): Promise<IQualificationRunOutcome> => {
  const preparedAttempt = await prepareAttempt(options);
  const { attemptDirectory } = preparedAttempt;
  let checkpoint = preparedAttempt.checkpoint;
  const compatibilitySnapshot = await loadRuntimeCompatibilitySnapshot(
    checkpoint.packagesRepository,
  );
  const target = await resolveQualificationTarget(
    checkpoint.selection,
    checkpoint.packagesRepository,
    compatibilitySnapshot.matrix,
  );
  const customTarget =
    checkpoint.selection.adapterId === 'custom' &&
    checkpoint.selection.implementationId === 'custom'
      ? target
      : await resolveQualificationTarget(
          { adapterId: 'custom', implementationId: 'custom' },
          checkpoint.packagesRepository,
          compatibilitySnapshot.matrix,
        );
  const selectedProfileCases =
    checkpoint.selectedCaseId === null
      ? target.profile.cases
      : target.profile.cases.filter(({ id }) => id === checkpoint.selectedCaseId);
  if (selectedProfileCases.length === 0) {
    throw new Error(`Qualification profile does not contain case ${checkpoint.selectedCaseId}.`);
  }
  const stageIds = createQualificationStageIds(
    selectedProfileCases.map(({ id }) => id),
    checkpoint.mode !== 'diagnostic',
  );
  const publicDirectory = path.join(attemptDirectory, 'public');
  const internalDirectory = path.join(attemptDirectory, 'internal');
  const resultsRoot = options.resultsRoot ?? QUALIFICATION_RESULTS_ROOT;
  const resultSanitizationContext = {
    attemptDirectory,
    packagesRepository: checkpoint.packagesRepository,
    skillRepository: checkpoint.skillRepository,
  };
  await Promise.all([ensureDirectory(publicDirectory), ensureDirectory(internalDirectory)]);

  if (!(await pathExists(path.join(checkpoint.skillRepository, 'SKILL.md')))) {
    throw new Error(
      `Candidate skill directory does not contain SKILL.md: ${checkpoint.skillRepository}`,
    );
  }

  const inputState = await inspectQualificationInputState(
    compatibilitySnapshot.repositoryState,
    checkpoint.skillRepository,
    target,
  );
  const { packagesState, qualificationState, skillState } = inputState;
  const { qualificationDigest } = inputState;

  if (
    checkpoint.profileDigest !== target.profileDigest ||
    checkpoint.targetDigest !== target.targetDigest ||
    haveQualificationInputsChanged(checkpoint, inputState)
  ) {
    throw new Error(
      'Attempt inputs changed after checkpoint creation. Start a retry so the new evidence has a new identity.',
    );
  }

  if (checkpoint.executionEnvironment === null) {
    throw new Error(
      'Attempt checkpoint predates exact execution-host identity. Start a retry with the current qualification engine.',
    );
  }
  const executionEnvironment = checkpoint.executionEnvironment;

  if (preparedAttempt.isResume) {
    const currentExecutionEnvironment = await inspectQualificationExecutionEnvironment(
      options.host,
    );

    if (
      haveQualificationExecutionInputsChanged(executionEnvironment, currentExecutionEnvironment)
    ) {
      throw new Error(
        'Attempt execution-host inputs changed after checkpoint creation. Start a retry so the new evidence has a new identity.',
      );
    }
  }

  let provenance = createQualificationExecutionProvenance({
    executionEnvironment,
    packagesState,
    profileDigest: target.profileDigest,
    qualificationDigest,
    qualificationState,
    skillState,
    targetDigest: target.targetDigest,
  });
  const caseResults: IQualificationCaseResult[] = [];
  let baselineAttemptId: string | null = provenance.baselineAttemptId;
  let reusableCaseCount = 0;
  let activeStageId: string | null = null;
  const workerCount = options.workerCount ?? EVALUATION_BATCH_DEFAULT_WORKER_COUNT;
  const tokenController =
    options.tokenController ??
    createQualificationBatchTokenController({
      initialTokensConsumed: checkpoint.candidateTokensConsumed,
      totalTokenLimit: checkpoint.candidateTokenLimit,
      workerCount,
    });
  let checkpointMutationQueue = Promise.resolve();

  /** Serializes every checkpoint and candidate-token mutation across concurrent case workers. */
  const updateCheckpoint = async (
    operation: (
      currentCheckpoint: IQualificationAttemptCheckpoint,
    ) => Promise<IQualificationAttemptCheckpoint>,
  ): Promise<void> => {
    const queuedMutation = checkpointMutationQueue.then(async () => {
      checkpoint = await operation(checkpoint);
    });
    checkpointMutationQueue = queuedMutation.catch(() => {});
    await queuedMutation;
  };
  const verifyExecutionInputs = async (): Promise<void> => {
    if (checkpoint.mode === 'dry-run') {
      return;
    }

    const currentCompatibilitySnapshot = await loadRuntimeCompatibilitySnapshot(
      checkpoint.packagesRepository,
    );
    const currentTarget = await resolveQualificationTarget(
      checkpoint.selection,
      checkpoint.packagesRepository,
      currentCompatibilitySnapshot.matrix,
    );
    const [currentInputState, currentExecutionEnvironment] = await Promise.all([
      inspectQualificationInputState(
        currentCompatibilitySnapshot.repositoryState,
        checkpoint.skillRepository,
        currentTarget,
      ),
      inspectQualificationExecutionEnvironment(options.host),
    ]);
    const hasDirtyInput =
      currentInputState.packagesState.isDirty ||
      currentInputState.qualificationState.isDirty ||
      currentInputState.skillState.isDirty;

    if (
      checkpoint.profileDigest !== currentTarget.profileDigest ||
      checkpoint.targetDigest !== currentTarget.targetDigest ||
      haveQualificationInputsChanged(checkpoint, currentInputState) ||
      haveQualificationExecutionInputsChanged(executionEnvironment, currentExecutionEnvironment) ||
      hasDirtyInput
    ) {
      throw new Error(
        'Qualification inputs changed during execution. Start a retry so the recorded evidence uses committed source and host configuration with a new identity.',
      );
    }

    if (checkpoint.mode === 'official' && checkpoint.selection.adapterId !== 'custom') {
      if (checkpoint.candidate === null) {
        throw new Error('Qualification candidate identity is unavailable for baseline validation.');
      }

      const baseline = await inspectQualificationBaseline({
        candidate: checkpoint.candidate,
        customTargetDigest: customTarget.targetDigest,
        executionEnvironment,
        isDryRun: checkpoint.isDryRun,
        qualificationBaselineDigest: currentInputState.qualificationBaselineDigest,
        resultsRoot,
        selection: checkpoint.selection,
        skillState: currentInputState.skillState,
      });

      if (!baseline.passed || baseline.baselineAttemptId !== baselineAttemptId) {
        throw new Error(
          'The compatible Custom baseline changed during execution. Start a retry with stable committed evidence.',
        );
      }
    }
  };
  let hasApprovedPaidExecution = false;
  let paidExecutionApproval: Promise<void> | null = null;
  const approvePaidExecution = async (): Promise<void> => {
    if (checkpoint.mode === 'dry-run' || hasApprovedPaidExecution) {
      return;
    }

    paidExecutionApproval ??= (async () => {
      try {
        const isApproved =
          options.requestPaidExecutionApproval === undefined
            ? false
            : await options.requestPaidExecutionApproval({
                model: executionEnvironment.model,
                ...(() => {
                  const plannedCallCount = getQualificationPlannedCallCount(
                    selectedProfileCases.length - reusableCaseCount,
                    checkpoint.mode !== 'diagnostic',
                  );
                  const maximumCallCount = getQualificationMaximumCallCount(plannedCallCount);
                  return {
                    candidateCount: 1,
                    maximumCallCount,
                    maximumTokenCount: checkpoint.candidateTokenLimit,
                    maximumTokensPerCall: getQualificationMaximumTokenCount(1),
                    plannedCallCount,
                    directCaseCount: selectedProfileCases.length - reusableCaseCount,
                    reusedCaseCount: reusableCaseCount,
                    candidateTokensConsumed: checkpoint.candidateTokensConsumed,
                  };
                })(),
                actorReasoningEffort: executionEnvironment.actorReasoningEffort,
                judgeReasoningEffort: executionEnvironment.judgeReasoningEffort,
              });

        if (!isApproved) {
          throw new PaidExecutionApprovalError(
            'Paid qualification was not approved immediately before model execution.',
          );
        }
      } catch (error) {
        if (error instanceof PaidExecutionApprovalError) {
          throw error;
        }

        throw new PaidExecutionApprovalError(
          error instanceof Error
            ? error.message
            : 'Paid qualification approval could not be established.',
          { cause: error },
        );
      }

      hasApprovedPaidExecution = true;
    })();
    await paidExecutionApproval;
  };
  const reservePaidExecution = async (): Promise<void> => {
    tokenController.reserve();
    try {
      await updateCheckpoint((currentCheckpoint) =>
        reserveQualificationCandidateTokens(attemptDirectory, currentCheckpoint),
      );
    } catch (error) {
      tokenController.release();
      throw error;
    }
  };
  const settlePaidExecution = async (
    usage: IQualificationTrialResult['actorUsage'],
  ): Promise<void> => {
    try {
      await updateCheckpoint((currentCheckpoint) =>
        settleQualificationCandidateTokens(attemptDirectory, currentCheckpoint, usage),
      );
    } finally {
      tokenController.settle(usage);
    }
  };

  if (preparedAttempt.isResume) {
    await Promise.all([
      rm(path.join(publicDirectory, 'error.json'), { force: true }),
      rm(path.join(publicDirectory, 'interruption.json'), { force: true }),
    ]);
  }

  try {
    const sourceStateStageId = 'source-state';
    const sourceStatePath = path.join(publicDirectory, 'source-state.json');
    const sourceState = isQualificationStageComplete(checkpoint, sourceStateStageId)
      ? await readJsonFile(sourceStatePath, QualificationSourceStateResultSchema)
      : await (async () => {
          activeStageId = sourceStateStageId;
          checkpoint = await startQualificationStage(
            attemptDirectory,
            checkpoint,
            sourceStateStageId,
          );
          const sourceStateResult = inspectQualificationSourceState({
            executionEnvironment,
            isDryRun: checkpoint.isDryRun,
            packagesState,
            qualificationState,
            skillState,
          });
          await writeJsonFileAtomically(sourceStatePath, sourceStateResult);
          checkpoint = await completeQualificationStage(
            attemptDirectory,
            checkpoint,
            sourceStateStageId,
            { status: sourceStateResult.passed ? 'passed' : 'failed' },
          );
          activeStageId = null;
          return sourceStateResult;
        })();

    if (!sourceState.passed) {
      const finalState = await persistFinalState({
        attemptDirectory,
        caseResults,
        checkpoint,
        provenance,
        stageIds,
        status: 'failed',
        summary:
          'Qualification stopped before candidate construction because official evidence requires clean source inputs and the trusted execution-host boundary.',
      });
      checkpoint = finalState.checkpoint;

      const wasRecorded = checkpoint.mode === 'official';
      const result = wasRecorded
        ? await recordQualificationResult(
            {
              artifactDirectory: publicDirectory,
              result: finalState.result,
              sanitizationContext: resultSanitizationContext,
            },
            resultsRoot,
          )
        : finalState.result;

      return { attemptDirectory, result, wasRecorded };
    }

    const coverageStageId = 'coverage';
    const coveragePath = path.join(publicDirectory, 'coverage.json');
    const coverage = isQualificationStageComplete(checkpoint, coverageStageId)
      ? await readJsonFile(coveragePath, QualificationCoverageResultSchema)
      : await (async () => {
          activeStageId = coverageStageId;
          checkpoint = await startQualificationStage(attemptDirectory, checkpoint, coverageStageId);
          const coverageResult = await inspectQualificationCoverage(
            target.profileDirectory,
            target.profile,
            target.adapter,
            target.target,
            target.caseCatalog,
          );
          await writeJsonFileAtomically(coveragePath, coverageResult);
          checkpoint = await completeQualificationStage(
            attemptDirectory,
            checkpoint,
            coverageStageId,
            { status: coverageResult.passed ? 'passed' : 'failed' },
          );
          activeStageId = null;
          return coverageResult;
        })();

    if (!coverage.passed) {
      const finalState = await persistFinalState({
        attemptDirectory,
        caseResults,
        checkpoint,
        provenance,
        stageIds,
        status: 'failed',
        summary:
          'Qualification failed because the profile does not cover the current matrix claims.',
      });
      checkpoint = finalState.checkpoint;
      const wasRecorded = checkpoint.mode === 'official';
      let result = finalState.result;

      if (wasRecorded) {
        result = await recordQualificationResult(
          {
            artifactDirectory: publicDirectory,
            result: finalState.result,
            sanitizationContext: resultSanitizationContext,
          },
          resultsRoot,
        );
      }

      return { attemptDirectory, result, wasRecorded };
    }

    const candidateStageId = 'candidate';
    const expectedCandidate = checkpoint.candidate;
    let candidate = checkpoint.candidate;

    {
      const isCandidateComplete = isQualificationStageComplete(checkpoint, candidateStageId);

      if (!isCandidateComplete) {
        activeStageId = candidateStageId;
        checkpoint = await startQualificationStage(attemptDirectory, checkpoint, candidateStageId);
      }

      const preparedCandidate = await prepareCandidateClosure({
        adapterPackage: target.adapter.implementation.package,
        attemptDirectory,
        ...(target.profile.runtimePackages === undefined
          ? {}
          : { runtimePackages: target.profile.runtimePackages }),
        signal: options.signal,
      });

      if (
        expectedCandidate !== null &&
        haveCandidateClosuresChanged(expectedCandidate, preparedCandidate)
      ) {
        throw new Error(
          'Candidate closure changed after checkpoint creation. Start a retry so the new package artifacts have a new identity.',
        );
      }

      candidate = preparedCandidate;
      checkpoint = QualificationAttemptCheckpointSchema.parse({
        ...checkpoint,
        candidate,
      });

      if (!isCandidateComplete) {
        checkpoint = await completeQualificationStage(
          attemptDirectory,
          checkpoint,
          candidateStageId,
          { status: 'passed' },
        );
      } else {
        await writeAttemptCheckpoint(attemptDirectory, checkpoint);
      }

      activeStageId = null;
    }

    const baselineStageId = 'baseline';
    const baselinePath = path.join(publicDirectory, 'baseline.json');
    const baseline = isQualificationStageComplete(checkpoint, baselineStageId)
      ? await readJsonFile(baselinePath, QualificationBaselineCheckSchema)
      : await (async () => {
          activeStageId = baselineStageId;
          checkpoint = await startQualificationStage(attemptDirectory, checkpoint, baselineStageId);
          const baselineResult = await inspectQualificationBaseline({
            candidate,
            customTargetDigest: customTarget.targetDigest,
            executionEnvironment,
            isDryRun: checkpoint.mode !== 'official',
            qualificationBaselineDigest: inputState.qualificationBaselineDigest,
            resultsRoot,
            selection: checkpoint.selection,
            skillState,
          });
          await writeJsonFileAtomically(baselinePath, baselineResult);
          checkpoint = await completeQualificationStage(
            attemptDirectory,
            checkpoint,
            baselineStageId,
            { status: baselineResult.passed ? 'passed' : 'failed' },
          );
          activeStageId = null;
          return baselineResult;
        })();
    baselineAttemptId = baseline.baselineAttemptId;
    provenance = { ...provenance, baselineAttemptId };

    if (!baseline.passed) {
      const finalState = await persistFinalState({
        attemptDirectory,
        caseResults,
        checkpoint,
        provenance,
        stageIds,
        status: 'failed',
        summary: `Qualification stopped because its Custom baseline is unavailable or incompatible: ${baseline.failures.join(' ')}`,
      });
      checkpoint = finalState.checkpoint;
      const wasRecorded = checkpoint.mode === 'official';
      let result = finalState.result;

      if (wasRecorded) {
        result = await recordQualificationResult(
          {
            artifactDirectory: publicDirectory,
            result: finalState.result,
            sanitizationContext: resultSanitizationContext,
          },
          resultsRoot,
        );
      }

      return { attemptDirectory, result, wasRecorded };
    }

    const reusableCases =
      checkpoint.mode === 'official' && checkpoint.reuseEvidence
        ? await loadReusableQualificationCases({
            baselineAttemptId,
            candidate,
            caseDigests: inputState.caseDigests,
            caseIds: selectedProfileCases.map(({ id }) => id),
            checkpoint,
            evaluatorStageDigest: inputState.evaluatorStageDigest,
            executionEnvironment,
            qualificationRepositoryCommit: qualificationState.commit,
            repositoryRoot: SKILL_REPOSITORY_ROOT,
            resultsRoot,
          })
        : new Map<string, IReusableQualificationCase>();
    reusableCaseCount = reusableCases.size;
    const caseTitles = new Map<string, string>();

    /** Starts one case-owned stage through the attempt's single checkpoint writer. */
    const startCaseStage = (stageId: string): Promise<void> =>
      updateCheckpoint((currentCheckpoint) =>
        startQualificationStage(attemptDirectory, currentCheckpoint, stageId),
      );

    /** Completes one case-owned stage through the attempt's single checkpoint writer. */
    const completeCaseStage = (
      stageId: string,
      stageOptions: Parameters<typeof completeQualificationStage>[3],
    ): Promise<void> =>
      updateCheckpoint((currentCheckpoint) =>
        completeQualificationStage(attemptDirectory, currentCheckpoint, stageId, stageOptions),
      );

    /** Executes or restores one complete initial or confirmation trial from pristine state. */
    const executeTrial = async (
      profileCase: IQualificationProfileCase,
      trialId: IQualificationTrialResult['trialId'],
    ): Promise<IQualificationTrialResult> => {
      await options.onProgress?.({
        kind: 'trial',
        caseId: profileCase.id,
        status: 'started',
        trialId,
      });
      const trialStartedAt = performance.now();
      const trialRoot = `cases/${profileCase.id}/trials/${trialId}`;
      const trialArtifactDirectory = path.join(publicDirectory, trialRoot);
      const workspaceDirectory = path.join(attemptDirectory, 'workspaces', profileCase.id, trialId);
      const internalTrialDirectory = path.join(
        internalDirectory,
        'cases',
        profileCase.id,
        'trials',
        trialId,
      );
      await rm(workspaceDirectory, { force: true, recursive: true });
      await ensureDirectory(trialArtifactDirectory);

      const prepareStageId = `case:${profileCase.id}:trial:${trialId}:prepare`;
      const isPrepareComplete = isQualificationStageComplete(checkpoint, prepareStageId);

      if (!isPrepareComplete) {
        await startCaseStage(prepareStageId);
      }

      const project = await prepareQualificationProject({
        attemptDirectory,
        candidate,
        profileCase,
        profileDirectory: target.profileDirectory,
        skillRepository: checkpoint.skillRepository,
        skillState,
        signal: options.signal,
        workspaceDirectory,
      });
      caseTitles.set(profileCase.id, project.scenario.title);
      const workspaceKey = `${profileCase.id}:${trialId}`;
      if (!isPrepareComplete) {
        await updateCheckpoint((currentCheckpoint) =>
          completeQualificationStage(
            attemptDirectory,
            QualificationAttemptCheckpointSchema.parse({
              ...currentCheckpoint,
              workspaceDirectories: {
                ...currentCheckpoint.workspaceDirectories,
                [workspaceKey]: project.workspaceDirectory,
              },
            }),
            prepareStageId,
            { status: 'passed' },
          ),
        );
      } else {
        await updateCheckpoint(async (currentCheckpoint) => {
          const updatedCheckpoint = QualificationAttemptCheckpointSchema.parse({
            ...currentCheckpoint,
            workspaceDirectories: {
              ...currentCheckpoint.workspaceDirectories,
              [workspaceKey]: project.workspaceDirectory,
            },
          });
          await writeAttemptCheckpoint(attemptDirectory, updatedCheckpoint);
          return updatedCheckpoint;
        });
      }

      const task = await readQualificationTask(project);
      const caseDigest = inputState.caseDigests[profileCase.id];
      if (caseDigest === undefined) {
        throw new Error(`Qualification input identity is missing case ${profileCase.id}.`);
      }
      const deterministicBeforeStageId = `case:${profileCase.id}:trial:${trialId}:deterministic-before`;
      const deterministicBeforePath = path.join(
        trialArtifactDirectory,
        'deterministic-before.json',
      );
      const deterministicBefore = isQualificationStageComplete(
        checkpoint,
        deterministicBeforeStageId,
      )
        ? await readJsonFile(deterministicBeforePath, DeterministicVerificationArtifactSchema)
        : await (async () => {
            await startCaseStage(deterministicBeforeStageId);
            const result = await verifyDeterministicProject({
              adapterId: target.selection.adapterId,
              adapterPackage: target.adapter.implementation.package,
              candidate,
              expectedEvidence: project.scenario.deterministicEvidence.before,
              expectedInspectionStatus: project.scenario.inspection.before,
              signal: options.signal,
              workspaceDirectory: project.workspaceDirectory,
            });
            await writeJsonFileAtomically(
              deterministicBeforePath,
              sanitizeEvidenceValue(result, {
                packagesRepository: checkpoint.packagesRepository,
                skillRepository: checkpoint.skillRepository,
                workspaceDirectory: project.workspaceDirectory,
              }),
            );
            await completeCaseStage(deterministicBeforeStageId, {
              status: result.summary.passed ? 'passed' : 'failed',
            });
            return result;
          })();

      if (!deterministicBefore.summary.passed) {
        throw new Error(
          `Case ${profileCase.id} trial ${trialId} failed deterministic preflight: ${deterministicBefore.summary.failures.join(' ')}`,
        );
      }

      const preActorSnapshotDirectory = path.join(internalTrialDirectory, 'pre-actor-workspace');
      await rm(preActorSnapshotDirectory, { force: true, recursive: true });
      await captureQualificationProjectSnapshot(project, preActorSnapshotDirectory);
      const actorStageId = `case:${profileCase.id}:trial:${trialId}:actor`;
      const actorSnapshotDirectory = path.join(internalTrialDirectory, 'actor-workspace');
      const actorResult = isQualificationStageComplete(checkpoint, actorStageId)
        ? await restoreActorModelStage({
            caseArtifactDirectory: trialArtifactDirectory,
            project,
            snapshotDirectory: actorSnapshotDirectory,
          })
        : await (async () => {
            await startCaseStage(actorStageId);
            const initialOperationalFailureCount =
              checkpoint.stages[actorStageId]?.operationalRetries.length ?? 0;
            const result = await executeActorModelStage({
              adapterId: target.selection.adapterId,
              approvePaidExecution,
              reservePaidExecution,
              attemptDirectory,
              attemptId: checkpoint.attemptId,
              candidate,
              caseDigest,
              caseArtifactDirectory: trialArtifactDirectory,
              executionEnvironment,
              host: options.host,
              implementationId: target.selection.implementationId,
              initialOperationalFailureCount,
              isDryRun: checkpoint.isDryRun,
              onStageIdentity: async (stageIdentity) => {
                await updateCheckpoint((currentCheckpoint) =>
                  setQualificationStageIdentity(
                    attemptDirectory,
                    currentCheckpoint,
                    actorStageId,
                    stageIdentity,
                  ),
                );
              },
              onOperationalRetry: async (retry) => {
                await updateCheckpoint((currentCheckpoint) =>
                  appendQualificationOperationalRetry(
                    attemptDirectory,
                    currentCheckpoint,
                    actorStageId,
                    retry,
                  ),
                );
                await options.onProgress?.({
                  kind: 'operational-retry',
                  caseId: profileCase.id,
                  retry,
                  role: 'actor',
                  stageId: actorStageId,
                  trialId,
                });
              },
              onOperationalStop: async (stop) => {
                await updateCheckpoint((currentCheckpoint) =>
                  appendQualificationOperationalStop(
                    attemptDirectory,
                    currentCheckpoint,
                    actorStageId,
                    QualificationOperationalStopSchema.parse(stop),
                  ),
                );
                await options.onProgress?.({
                  kind: 'operational-stop',
                  caseId: profileCase.id,
                  role: 'actor',
                  stageId: actorStageId,
                  stop,
                  trialId,
                });
              },
              ...(options.operationalRetry === undefined
                ? {}
                : { operationalRetry: options.operationalRetry }),
              packagesRepository: checkpoint.packagesRepository,
              evaluatorStageDigest: inputState.evaluatorStageDigest,
              baselineAttemptId,
              project,
              restorePreActorState: () =>
                restoreQualificationProjectSnapshot(project, preActorSnapshotDirectory),
              runWithTemporaryStorageGuard: (operation) =>
                runWithQualificationTemporaryStorageGuard({
                  attemptDirectory,
                  internalTrialDirectory,
                  operation,
                  publicTrialDirectory: trialArtifactDirectory,
                  ...(options.signal === undefined ? {} : { signal: options.signal }),
                  workspaceDirectory,
                }),
              signal: options.signal,
              skillDigest: checkpoint.skillDigest,
              targetDigest: checkpoint.targetDigest,
              skillRepository: checkpoint.skillRepository,
              settlePaidExecution,
              snapshotDirectory: actorSnapshotDirectory,
              task,
              trialId,
              verifyExecutionInputs,
            });
            await completeCaseStage(actorStageId, {
              status: result.evidence.reuseSourceAttemptId === null ? 'passed' : 'reused',
              stageIdentity: result.evidence.stageIdentity,
              reuseSourceAttemptId: result.evidence.reuseSourceAttemptId,
            });
            return result;
          })();

      const deterministicAfterStageId = `case:${profileCase.id}:trial:${trialId}:deterministic-after`;
      const deterministicAfterPath = path.join(trialArtifactDirectory, 'deterministic-after.json');
      const deterministicAfter = isQualificationStageComplete(checkpoint, deterministicAfterStageId)
        ? await readJsonFile(deterministicAfterPath, DeterministicVerificationArtifactSchema)
        : await (async () => {
            await startCaseStage(deterministicAfterStageId);
            const result = await verifyDeterministicProject({
              adapterId: target.selection.adapterId,
              adapterPackage: target.adapter.implementation.package,
              candidate,
              expectedEvidence: project.scenario.deterministicEvidence.after,
              expectedInspectionStatus: project.scenario.inspection.after,
              signal: options.signal,
              workspaceDirectory: project.workspaceDirectory,
            });
            await writeJsonFileAtomically(
              deterministicAfterPath,
              sanitizeEvidenceValue(result, {
                packagesRepository: checkpoint.packagesRepository,
                skillRepository: checkpoint.skillRepository,
                workspaceDirectory: project.workspaceDirectory,
              }),
            );
            await completeCaseStage(deterministicAfterStageId, {
              status: result.summary.passed ? 'passed' : 'failed',
            });
            return result;
          })();

      const assertionsStageId = `case:${profileCase.id}:trial:${trialId}:assertions`;
      const assertionsPath = path.join(trialArtifactDirectory, 'workspace-assertions.json');
      const workspaceAssertions = isQualificationStageComplete(checkpoint, assertionsStageId)
        ? await readJsonFile(assertionsPath, WorkspaceAssertionResultSchema)
        : await (async () => {
            await startCaseStage(assertionsStageId);
            const result = await inspectWorkspaceAssertions(project, actorResult.output);
            await writeJsonFileAtomically(assertionsPath, result);
            await completeCaseStage(assertionsStageId, {
              status: result.passed ? 'passed' : 'failed',
            });
            return result;
          })();
      const patchContent = sanitizeEvidenceText(
        await captureWorkspacePatch(project.workspaceDirectory),
        {
          packagesRepository: checkpoint.packagesRepository,
          skillRepository: checkpoint.skillRepository,
          workspaceDirectory: project.workspaceDirectory,
        },
      );
      await writeTextFileAtomically(
        path.join(trialArtifactDirectory, 'workspace.patch'),
        patchContent,
      );

      const judgeStageId = `case:${profileCase.id}:trial:${trialId}:judge`;
      const judgeWorkspaceDirectory = path.join(internalTrialDirectory, 'judge-workspace');
      const runnerAssessments = createRunnerRequirementAssessments({
        actorCommandPolicy: actorResult.evidence.commandPolicy,
        actorOutput: actorResult.output,
        deterministicAfter: deterministicAfter.summary,
        scenario: project.scenario,
        workspaceAssertions,
      });
      const hasFailedRunnerRequirement = runnerAssessments.some(
        ({ verdict }) => verdict === 'fail',
      );
      const actorCommandPolicyFailures = deriveQualificationCommandPolicyFailures({
        actorCommandPolicy: actorResult.evidence.commandPolicy,
        judgeCommandPolicy: null,
      });
      const actorResourceAssessment = inspectQualificationResourceUsage({
        allowMissingUsage: checkpoint.isDryRun,
        evidence: actorResult.evidence,
        role: 'Actor',
        scenario: project.scenario,
      });
      const hasJudgeRequirements = project.scenario.judgeRequirements.some(
        (requirement) => requirement.evaluation.kind === 'judge',
      );
      const shouldSkipJudge =
        checkpoint.isDryRun ||
        !deterministicAfter.summary.passed ||
        !workspaceAssertions.passed ||
        hasFailedRunnerRequirement ||
        actorCommandPolicyFailures.length > 0 ||
        actorResourceAssessment.hasJudgeBlocker ||
        !hasJudgeRequirements;
      const judgeSkippedPath = path.join(trialArtifactDirectory, 'judge-skipped.json');
      const judgeResult = shouldSkipJudge
        ? await (async () => {
            if (checkpoint.stages[judgeStageId]?.status !== 'skipped') {
              await startCaseStage(judgeStageId);
              await writeJsonFileAtomically(
                judgeSkippedPath,
                QualificationJudgeSkippedSchema.parse({
                  kind: checkpoint.isDryRun
                    ? 'model-free-dry-run'
                    : hasJudgeRequirements
                      ? 'deterministic-failure'
                      : 'no-judge-requirements',
                  reason: checkpoint.isDryRun
                    ? 'The model-free dry run does not evaluate semantic judge requirements.'
                    : hasJudgeRequirements
                      ? 'The judge was skipped because runner-owned evidence already failed.'
                      : 'The scenario has no model-owned judge requirements.',
                  deterministicAfterPassed: deterministicAfter.summary.passed,
                  workspaceAssertionsPassed: workspaceAssertions.passed,
                }),
              );
              await completeCaseStage(judgeStageId, { status: 'skipped' });
            }
            return null;
          })()
        : isQualificationStageComplete(checkpoint, judgeStageId)
          ? await restoreJudgeModelStage({
              caseArtifactDirectory: trialArtifactDirectory,
              scenario: project.scenario,
            })
          : await (async () => {
              await startCaseStage(judgeStageId);
              const initialOperationalFailureCount =
                checkpoint.stages[judgeStageId]?.operationalRetries.length ?? 0;
              const result = await executeJudgeModelStage({
                actorCommandPolicy: actorResult.evidence.commandPolicy,
                actorOutput: actorResult.output,
                adapterId: target.selection.adapterId,
                approvePaidExecution,
                reservePaidExecution,
                attemptDirectory,
                attemptId: checkpoint.attemptId,
                candidate,
                caseDigest,
                caseArtifactDirectory: trialArtifactDirectory,
                deterministicAfter: deterministicAfter.summary,
                executionEnvironment,
                host: options.host,
                implementationId: target.selection.implementationId,
                initialOperationalFailureCount,
                isDryRun: checkpoint.isDryRun,
                judgeWorkspaceDirectory,
                onStageIdentity: async (stageIdentity) => {
                  await updateCheckpoint((currentCheckpoint) =>
                    setQualificationStageIdentity(
                      attemptDirectory,
                      currentCheckpoint,
                      judgeStageId,
                      stageIdentity,
                    ),
                  );
                },
                onOperationalRetry: async (retry) => {
                  await updateCheckpoint((currentCheckpoint) =>
                    appendQualificationOperationalRetry(
                      attemptDirectory,
                      currentCheckpoint,
                      judgeStageId,
                      retry,
                    ),
                  );
                  await options.onProgress?.({
                    kind: 'operational-retry',
                    caseId: profileCase.id,
                    retry,
                    role: 'judge',
                    stageId: judgeStageId,
                    trialId,
                  });
                },
                onOperationalStop: async (stop) => {
                  await updateCheckpoint((currentCheckpoint) =>
                    appendQualificationOperationalStop(
                      attemptDirectory,
                      currentCheckpoint,
                      judgeStageId,
                      QualificationOperationalStopSchema.parse(stop),
                    ),
                  );
                  await options.onProgress?.({
                    kind: 'operational-stop',
                    caseId: profileCase.id,
                    role: 'judge',
                    stageId: judgeStageId,
                    stop,
                    trialId,
                  });
                },
                ...(options.operationalRetry === undefined
                  ? {}
                  : { operationalRetry: options.operationalRetry }),
                packagesRepository: checkpoint.packagesRepository,
                evaluatorStageDigest: inputState.evaluatorStageDigest,
                baselineAttemptId,
                project,
                runWithTemporaryStorageGuard: (operation) =>
                  runWithQualificationTemporaryStorageGuard({
                    attemptDirectory,
                    internalTrialDirectory,
                    operation,
                    publicTrialDirectory: trialArtifactDirectory,
                    ...(options.signal === undefined ? {} : { signal: options.signal }),
                    workspaceDirectory,
                  }),
                signal: options.signal,
                skillDigest: checkpoint.skillDigest,
                targetDigest: checkpoint.targetDigest,
                skillRepository: checkpoint.skillRepository,
                settlePaidExecution,
                task,
                trialId,
                verifyExecutionInputs,
                workspaceAssertions,
              });
              await completeCaseStage(judgeStageId, {
                status: result.evidence.reuseSourceAttemptId === null ? 'passed' : 'reused',
                stageIdentity: result.evidence.stageIdentity,
                reuseSourceAttemptId: result.evidence.reuseSourceAttemptId,
              });
              return result;
            })();

      const requirementAssessments = mergeQualificationRequirementAssessments({
        judgeOutput: judgeResult?.output ?? null,
        runnerAssessments,
        scenario: project.scenario,
        isJudgeEvaluated: judgeResult !== null,
      });
      const failedRequirements = requirementAssessments
        .filter(({ verdict }) => verdict === 'fail')
        .map(({ evidence, id }) => `Requirement ${id} failed: ${evidence}`);
      const actorOutcomeFailures =
        actorResult.output.outcome === project.scenario.expectedActorOutcome
          ? []
          : [
              `Actor outcome ${actorResult.output.outcome} did not match expected outcome ${project.scenario.expectedActorOutcome}.`,
            ];
      const commandPolicyFailures = deriveQualificationCommandPolicyFailures({
        actorCommandPolicy: actorResult.evidence.commandPolicy,
        judgeCommandPolicy: judgeResult?.evidence.commandPolicy ?? null,
      });
      const resourceFailures = [
        ...actorResourceAssessment.failures,
        ...(judgeResult === null
          ? []
          : inspectQualificationResourceUsage({
              allowMissingUsage: checkpoint.isDryRun,
              evidence: judgeResult.evidence,
              role: 'Judge',
              scenario: project.scenario,
            }).failures),
      ];
      const failures = [
        ...actorOutcomeFailures,
        ...commandPolicyFailures,
        ...resourceFailures,
        ...deterministicAfter.summary.failures,
        ...workspaceAssertions.failures,
        ...failedRequirements,
        ...(judgeResult?.output.verdict === 'fail' ? judgeResult.output.failures : []),
      ];
      const dimensions = {
        semantic:
          checkpoint.isDryRun ||
          (!hasJudgeRequirements && actorOutcomeFailures.length === 0) ||
          (actorOutcomeFailures.length === 0 &&
            judgeResult !== null &&
            judgeResult.output.verdict === 'pass' &&
            !requirementAssessments.some(
              ({ evaluator, verdict }) => evaluator === 'judge' && verdict === 'fail',
            )),
        resource: resourceFailures.length === 0,
        commandPolicy: commandPolicyFailures.length === 0,
        repositoryControl: deterministicAfter.summary.passed,
        mountIntegrity: workspaceAssertions.passed,
        operational: true,
      };
      const failureClassifications = Object.entries(dimensions)
        .filter(([, passed]) => !passed)
        .map(([dimension]) => dimension);
      const confirmationEligible =
        !dimensions.semantic &&
        Object.entries(dimensions)
          .filter(([dimension]) => dimension !== 'semantic')
          .every(([, passed]) => passed);
      const confirmationIndex =
        trialId === 'initial' ? null : Number(trialId.slice('confirmation-'.length));
      const trialResult = QualificationTrialResultSchema.parse(
        sanitizeEvidenceValue(
          {
            trialId,
            kind: trialId === 'initial' ? 'initial' : 'confirmation',
            confirmationIndex,
            confirmationEligible,
            dimensions,
            failureClassifications,
            passed: Object.values(dimensions).every(Boolean),
            durationMs: Math.max(0, Math.round(performance.now() - trialStartedAt)),
            deterministicBeforePath: `${trialRoot}/deterministic-before.json`,
            deterministicAfterPath: `${trialRoot}/deterministic-after.json`,
            actorOutputPath: `${trialRoot}/actor-output.json`,
            judgeStatus: judgeResult === null ? 'skipped' : 'completed',
            judgeOutputPath: judgeResult === null ? null : `${trialRoot}/judge-output.json`,
            judgeSkippedPath: judgeResult === null ? `${trialRoot}/judge-skipped.json` : null,
            workspaceAssertionsPath: `${trialRoot}/workspace-assertions.json`,
            patchPath: `${trialRoot}/workspace.patch`,
            actorUsage: actorResult.evidence.usage,
            judgeUsage: judgeResult?.evidence.usage ?? null,
            actorEvidenceCreatedAt: actorResult.evidence.createdAt,
            judgeEvidenceCreatedAt: judgeResult?.evidence.createdAt ?? null,
            actorReuseSourceAttemptId: actorResult.evidence.reuseSourceAttemptId,
            judgeReuseSourceAttemptId: judgeResult?.evidence.reuseSourceAttemptId ?? null,
            requirementAssessments,
            failures,
          },
          {
            attemptDirectory,
            packagesRepository: checkpoint.packagesRepository,
            skillRepository: checkpoint.skillRepository,
            workspaceDirectory: project.workspaceDirectory,
          },
        ),
      );
      await writeJsonFileAtomically(
        path.join(trialArtifactDirectory, 'trial-result.json'),
        trialResult,
      );
      await options.onProgress?.({
        kind: 'trial',
        caseId: profileCase.id,
        passed: trialResult.passed,
        status: 'completed',
        trialId,
      });
      return trialResult;
    };

    const initialTrials = new Map<string, IQualificationTrialResult>();
    const completedCaseResults = new Map<string, IQualificationCaseResult>();

    for (const profileCase of selectedProfileCases) {
      const resultStageId = `case:${profileCase.id}:result`;
      const caseArtifactDirectory = path.join(publicDirectory, 'cases', profileCase.id);
      const caseResultPath = path.join(caseArtifactDirectory, 'case-result.json');

      if (isQualificationStageComplete(checkpoint, resultStageId)) {
        const caseResult = await readJsonFile(caseResultPath, QualificationCaseResultSchema);
        completedCaseResults.set(profileCase.id, caseResult);
        const initialTrial = caseResult.trials[0];
        if (initialTrial === undefined) {
          throw new Error(`Completed case ${profileCase.id} is missing its initial trial.`);
        }
        initialTrials.set(profileCase.id, initialTrial);
        continue;
      }

      const reusableCase = reusableCases.get(profileCase.id);
      if (reusableCase !== undefined) {
        const materialized = await materializeReusableQualificationCase({
          attemptDirectory,
          checkpoint,
          publicDirectory,
          reusableCase,
        });
        checkpoint = materialized.checkpoint;
        completedCaseResults.set(profileCase.id, materialized.caseResult);
        const initialTrial = materialized.caseResult.trials[0];
        if (initialTrial === undefined) {
          throw new Error(`Reusable case ${profileCase.id} is missing its initial trial.`);
        }
        initialTrials.set(profileCase.id, initialTrial);
      }
    }

    const isBatchInterruption = (error: unknown): boolean =>
      options.signal?.aborted === true ||
      error instanceof CodexEvaluationOperationalRetryExhaustedError ||
      error instanceof QualificationCandidateTokenLimitError ||
      (error instanceof Error && error.name === 'EvaluationBatchDiskLimitError');

    const recordCaseBatchFailure = async (
      profileCase: IQualificationProfileCase,
      error: unknown,
    ): Promise<void> => {
      if (isBatchInterruption(error)) return;
      const safeError = sanitizeEvidenceText(
        error instanceof Error ? error.message : 'Unknown qualification case-worker failure.',
        {
          attemptDirectory,
          packagesRepository: checkpoint.packagesRepository,
          skillRepository: checkpoint.skillRepository,
        },
      );
      await updateCheckpoint(async (currentCheckpoint) => {
        let updatedCheckpoint = currentCheckpoint;
        const runningStageIds = Object.values(currentCheckpoint.stages)
          .filter(
            ({ id, status }) => id.startsWith(`case:${profileCase.id}:`) && status === 'running',
          )
          .map(({ id }) => id);
        for (const stageId of runningStageIds) {
          updatedCheckpoint = await completeQualificationStage(
            attemptDirectory,
            updatedCheckpoint,
            stageId,
            { status: 'errored', error: safeError },
          );
        }
        return updatedCheckpoint;
      });
    };

    await assertQualificationBatchDiskAdmission(workerCount, attemptDirectory);
    const pendingInitialCases = selectedProfileCases.filter(
      ({ id }) => !completedCaseResults.has(id),
    );

    // collect every initial before confirmations expose the complete frozen-profile failure set
    await runOrderedEvaluationBatch<IQualificationProfileCase, IQualificationTrialResult>({
      commitItem: ({ item, value }) => {
        initialTrials.set(item.id, value);
      },
      executeItem: ({ item }) => executeTrial(item, 'initial'),
      items: pendingInitialCases,
      onItemError: ({ error, item }) => recordCaseBatchFailure(item, error),
      workerCount,
    });

    const resolveCase = async (
      profileCase: IQualificationProfileCase,
    ): Promise<IQualificationCaseResult> => {
      const initialTrial = initialTrials.get(profileCase.id);
      if (initialTrial === undefined) {
        throw new Error(`Case ${profileCase.id} is missing its collected initial trial.`);
      }

      const trials = [initialTrial];
      let status: IQualificationCaseResult['status'];
      let confirmationStatus: IQualificationCaseResult['confirmationStatus'];

      if (checkpoint.mode === 'diagnostic') {
        status = initialTrial.passed ? 'passed' : 'failed';
        confirmationStatus = initialTrial.passed
          ? 'not-required'
          : initialTrial.confirmationEligible
            ? 'not-run'
            : 'not-applicable';
      } else if (initialTrial.passed) {
        await updateCheckpoint((currentCheckpoint) =>
          skipQualificationStageGroup(attemptDirectory, currentCheckpoint, [
            ...createQualificationTrialStageIds(profileCase.id, 'confirmation-1'),
            ...createQualificationTrialStageIds(profileCase.id, 'confirmation-2'),
            ...createQualificationTrialStageIds(profileCase.id, 'confirmation-3'),
          ]),
        );
        status = 'passed';
        confirmationStatus = 'not-required';
      } else if (initialTrial.confirmationEligible) {
        let resolution: ReturnType<typeof getEvaluationConfirmationResolution> =
          'awaiting-confirmation';

        for (
          let confirmationIndex = 1;
          confirmationIndex <= QUALIFICATION_CONFIRMATION_POLICY.maximumConfirmations;
          confirmationIndex += 1
        ) {
          const trialId =
            `confirmation-${confirmationIndex}` as IQualificationTrialResult['trialId'];
          const confirmation = await executeTrial(profileCase, trialId);
          trials.push(confirmation);
          resolution = getEvaluationConfirmationResolution(
            trials.slice(1).map(({ passed }) => passed),
          );

          if (resolution !== 'awaiting-confirmation') {
            const skippedStageIds = Array.from(
              {
                length: QUALIFICATION_CONFIRMATION_POLICY.maximumConfirmations - confirmationIndex,
              },
              (_, offset) =>
                createQualificationTrialStageIds(
                  profileCase.id,
                  `confirmation-${confirmationIndex + offset + 1}` as IQualificationTrialResult['trialId'],
                ),
            ).flat();
            if (skippedStageIds.length > 0) {
              await updateCheckpoint((currentCheckpoint) =>
                skipQualificationStageGroup(attemptDirectory, currentCheckpoint, skippedStageIds),
              );
            }
            break;
          }
        }

        status = resolution === 'recovered' ? 'recovered' : 'failed';
        confirmationStatus = resolution === 'recovered' ? 'passed' : 'rejected';
      } else {
        await updateCheckpoint((currentCheckpoint) =>
          skipQualificationStageGroup(attemptDirectory, currentCheckpoint, [
            ...createQualificationTrialStageIds(profileCase.id, 'confirmation-1'),
            ...createQualificationTrialStageIds(profileCase.id, 'confirmation-2'),
            ...createQualificationTrialStageIds(profileCase.id, 'confirmation-3'),
          ]),
        );
        status = 'failed';
        confirmationStatus = 'not-applicable';
      }

      const terminalTrial = trials.at(-1);
      const caseResult = QualificationCaseResultSchema.parse({
        caseId: profileCase.id,
        title: caseTitles.get(profileCase.id) ?? profileCase.id,
        status,
        confirmationStatus,
        durationMs: trials.reduce((total, trial) => total + trial.durationMs, 0),
        trials,
        failures: status === 'failed' ? (terminalTrial?.failures ?? []) : [],
        reuse: null,
      });
      const resultStageId = `case:${profileCase.id}:result`;
      const caseResultPath = path.join(
        publicDirectory,
        'cases',
        profileCase.id,
        'case-result.json',
      );
      await startCaseStage(resultStageId);
      await writeJsonFileAtomically(caseResultPath, caseResult);
      await completeCaseStage(resultStageId, { status: 'passed' });
      return caseResult;
    };

    const pendingCaseResults = selectedProfileCases.filter(
      ({ id }) => !completedCaseResults.has(id),
    );
    await runOrderedEvaluationBatch<IQualificationProfileCase, IQualificationCaseResult>({
      commitItem: ({ item, value }) => {
        completedCaseResults.set(item.id, value);
      },
      executeItem: ({ item }) => resolveCase(item),
      items: pendingCaseResults,
      onItemError: ({ error, item }) => recordCaseBatchFailure(item, error),
      workerCount,
    });

    for (const profileCase of selectedProfileCases) {
      const caseResult = completedCaseResults.get(profileCase.id);
      if (caseResult === undefined) {
        throw new Error(`Case ${profileCase.id} has no terminal result.`);
      }
      caseResults.push(caseResult);
    }

    await verifyExecutionInputs();

    const hasFailedCase = caseResults.some(({ status }) => status === 'failed');
    const recoveredCaseCount = caseResults.filter(({ status }) => status === 'recovered').length;
    const finalState = await persistFinalState({
      attemptDirectory,
      caseResults,
      checkpoint,
      provenance,
      stageIds,
      status: hasFailedCase ? 'failed' : 'passed',
      summary:
        checkpoint.mode === 'dry-run'
          ? hasFailedCase
            ? 'Model-free dry-run preflight failed runner-owned checks.'
            : 'Model-free dry-run preflight passed; semantic judge requirements remain not evaluated.'
          : checkpoint.mode === 'diagnostic'
            ? hasFailedCase
              ? 'The diagnostic case failed its initial trial without confirmation.'
              : 'The diagnostic case passed its initial trial without producing release evidence.'
            : hasFailedCase
              ? 'Qualification completed every case and recorded its confirmed failures.'
              : recoveredCaseCount > 0
                ? `Qualification passed with ${recoveredCaseCount} recovered case(s).`
                : 'Qualification passed every deterministic and semantic case.',
    });
    checkpoint = finalState.checkpoint;
    const wasRecorded = checkpoint.mode === 'official';
    let result = finalState.result;

    if (wasRecorded) {
      result = await recordQualificationResult(
        {
          artifactDirectory: publicDirectory,
          result: finalState.result,
          sanitizationContext: resultSanitizationContext,
        },
        resultsRoot,
      );
    }

    return { attemptDirectory, result, wasRecorded };
  } catch (error) {
    const isApprovalDeclined = error instanceof PaidExecutionApprovalError;
    const isOperationallyStopped = error instanceof CodexEvaluationOperationalRetryExhaustedError;
    const isCandidateTokenStop = error instanceof QualificationCandidateTokenLimitError;
    const isDiskStop = error instanceof Error && error.name === 'EvaluationBatchDiskLimitError';
    const isInterrupted =
      options.signal?.aborted === true ||
      isApprovalDeclined ||
      isOperationallyStopped ||
      isCandidateTokenStop ||
      isDiskStop;
    const safeError = sanitizeEvidenceText(
      error instanceof Error ? error.message : 'Unknown qualification execution failure.',
      {
        attemptDirectory,
        packagesRepository: checkpoint.packagesRepository,
        skillRepository: checkpoint.skillRepository,
      },
    );

    if (activeStageId !== null && !isInterrupted) {
      checkpoint = await completeQualificationStage(attemptDirectory, checkpoint, activeStageId, {
        status: 'errored',
        error: safeError,
      });
    }

    if (isInterrupted && !isOperationallyStopped) {
      checkpoint = normalizeInterruptedCheckpoint(checkpoint);
    }

    await writeJsonFileAtomically(
      path.join(publicDirectory, isInterrupted ? 'interruption.json' : 'error.json'),
      sanitizeEvidenceValue(
        {
          stageId: activeStageId,
          message: safeError,
        },
        {
          attemptDirectory,
          packagesRepository: checkpoint.packagesRepository,
          skillRepository: checkpoint.skillRepository,
        },
      ),
    );
    const status = isInterrupted ? 'incomplete' : 'errored';
    const finalState = await persistFinalState({
      attemptDirectory,
      caseResults,
      checkpoint,
      provenance,
      stageIds,
      status,
      summary: isInterrupted
        ? isApprovalDeclined
          ? `Qualification paused before paid execution: ${safeError}`
          : isOperationallyStopped
            ? `Qualification stopped after bounded operational recovery: ${safeError}`
            : isCandidateTokenStop
              ? `Qualification stopped at its candidate token boundary: ${safeError}`
              : isDiskStop
                ? `Qualification stopped at its temporary-storage boundary: ${safeError}`
                : 'Qualification was interrupted and can be resumed from its last atomic checkpoint.'
        : `Qualification stopped with an execution error: ${safeError}`,
    });
    checkpoint = finalState.checkpoint;
    const wasRecorded = checkpoint.mode === 'official' && !isInterrupted;
    let result = finalState.result;

    if (wasRecorded) {
      result = await recordQualificationResult(
        {
          artifactDirectory: publicDirectory,
          result: finalState.result,
          sanitizationContext: resultSanitizationContext,
        },
        resultsRoot,
      );
    }

    return { attemptDirectory, result, wasRecorded };
  } finally {
    await cleanupQualificationAttemptRuntime(
      attemptDirectory,
      (checkpoint.status === 'incomplete' || checkpoint.status === 'running') &&
        checkpoint.recordedAt === null,
    );
  }
};
