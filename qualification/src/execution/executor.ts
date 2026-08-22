import { randomUUID } from 'node:crypto';
import { access, rm } from 'node:fs/promises';
import path from 'node:path';

import { prepareCandidateClosure } from '../candidate-closure/index.ts';
import {
  inspectQualificationBaseline,
  QualificationBaselineCheckSchema,
} from '../baseline/index.ts';
import {
  createAttemptCheckpoint,
  normalizeInterruptedCheckpoint,
  readAttemptCheckpoint,
  writeAttemptCheckpoint,
} from '../checkpoint/index.ts';
import { resolveQualificationTarget } from '../compatibility/index.ts';
import {
  DEFAULT_PACKAGES_REPOSITORY,
  DEFAULT_SKILL_REPOSITORY,
  QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES,
  QUALIFICATION_RESULTS_ROOT,
  SKILL_REPOSITORY_ROOT,
} from '../constants/index.ts';
import {
  DeterministicVerificationArtifactSchema,
  QualificationAttemptCheckpointSchema,
  QualificationCaseResultSchema,
  QualificationJudgeSkippedSchema,
  QualificationSourceStateResultSchema,
  WorkspaceAssertionResultSchema,
  type IQualificationAttemptCheckpoint,
  type IQualificationAttemptResult,
  type IQualificationCaseResult,
} from '../contracts/index.ts';
import {
  inspectQualificationCoverage,
  QualificationCoverageResultSchema,
} from '../coverage/index.ts';
import { verifyDeterministicProject } from '../deterministic/index.ts';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import {
  captureWorkspacePatch,
  inspectWorkspaceAssertions,
  prepareQualificationProject,
  readQualificationTask,
} from '../project-fixture/index.ts';
import { inspectGitRepositoryState } from '../repository-state/index.ts';
import {
  recordQualificationResult,
  sanitizeEvidenceText,
  sanitizeEvidenceValue,
} from '../result/index.ts';
import { getLocalAttemptDirectory } from './attempts.ts';
import {
  calculatePackagesQualificationDigest,
  calculateQualificationDigest,
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
  completeQualificationStage,
  getQualificationModelCallCount,
  isQualificationStageComplete,
  startQualificationStage,
} from './stages.ts';
import { createQualificationAttemptResult } from './transformers.ts';
import {
  haveCandidateClosuresChanged,
  haveQualificationExecutionInputsChanged,
  haveQualificationInputsChanged,
  inspectQualificationSourceState,
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
 * Inspects every source tree that can affect qualification evidence.
 * @returns The package, qualification-suite, and portable-skill repository states.
 */
const inspectQualificationInputState = async (
  packagesRepository: string,
  skillRepository: string,
): Promise<IQualificationInputState> => {
  const [packagesState, qualificationDigest, qualificationState, skillState] = await Promise.all([
    inspectGitRepositoryState(packagesRepository, {
      excludedRelativePathPrefixes: ['qualification'],
    }),
    calculateQualificationDigest(),
    inspectGitRepositoryState(SKILL_REPOSITORY_ROOT, {
      includedRelativePathPrefixes: QUALIFICATION_ENGINE_RELATIVE_PATH_PREFIXES,
      excludedRelativePathPrefixes: ['qualification/results'],
    }),
    inspectGitRepositoryState(skillRepository),
  ]);
  const packagesDigest = await calculatePackagesQualificationDigest(
    packagesRepository,
    packagesState.entries,
  );

  return { packagesDigest, packagesState, qualificationDigest, qualificationState, skillState };
};

const createAttemptId = (adapterId: string, implementationId: string): string => {
  const timestamp = new Date().toISOString().replace(/[-:.]/gu, '');
  return `${timestamp}-${adapterId}-${implementationId}-${randomUUID().slice(0, 8)}`;
};

const createStageIds = (caseIds: readonly string[]): string[] => [
  'source-state',
  'coverage',
  'candidate',
  'baseline',
  ...caseIds.flatMap((caseId) => [
    `case:${caseId}:prepare`,
    `case:${caseId}:deterministic-before`,
    `case:${caseId}:actor`,
    `case:${caseId}:deterministic-after`,
    `case:${caseId}:assertions`,
    `case:${caseId}:judge`,
    `case:${caseId}:result`,
  ]),
];

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

    const checkpoint = normalizeInterruptedCheckpoint(rawCheckpoint);
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
  const target = await resolveQualificationTarget(options.selection, packagesRepository);
  const skillRepository = path.resolve(options.skillRepository ?? DEFAULT_SKILL_REPOSITORY);

  if (!(await pathExists(path.join(skillRepository, 'SKILL.md')))) {
    throw new Error(`Candidate skill directory does not contain SKILL.md: ${skillRepository}`);
  }

  const inputState = await inspectQualificationInputState(packagesRepository, skillRepository);
  const executionEnvironment = await inspectQualificationExecutionEnvironment(options.host);
  const attemptId = createAttemptId(
    options.selection.adapterId,
    options.selection.implementationId,
  );
  const attemptDirectory = getLocalAttemptDirectory(attemptId);
  const checkpoint = await createAttemptCheckpoint({
    attemptDirectory,
    attemptId,
    parentAttemptId: options.parentAttemptId ?? null,
    selection: options.selection,
    isDryRun: options.isDryRun ?? false,
    useCache: options.useCache ?? true,
    packagesRepository,
    skillRepository,
    profileDigest: target.profileDigest,
    qualificationDigest: inputState.qualificationDigest,
    skillDigest: inputState.skillState.fingerprint,
    packagesRepositoryFingerprint: inputState.packagesState.fingerprint,
    packagesDigest: inputState.packagesDigest,
    targetDigest: target.targetDigest,
    executionEnvironment,
    stageIds: createStageIds(target.profile.cases.map(({ id }) => id)),
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
  const target = await resolveQualificationTarget(
    checkpoint.selection,
    checkpoint.packagesRepository,
  );
  const stageIds = createStageIds(target.profile.cases.map(({ id }) => id));
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
    checkpoint.packagesRepository,
    checkpoint.skillRepository,
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
  let activeStageId: string | null = null;
  const verifyExecutionInputs = async (): Promise<void> => {
    if (checkpoint.isDryRun) {
      return;
    }

    const [currentInputState, currentExecutionEnvironment] = await Promise.all([
      inspectQualificationInputState(checkpoint.packagesRepository, checkpoint.skillRepository),
      inspectQualificationExecutionEnvironment(options.host),
    ]);
    const hasDirtyInput =
      currentInputState.packagesState.isDirty ||
      currentInputState.qualificationState.isDirty ||
      currentInputState.skillState.isDirty;

    if (
      haveQualificationInputsChanged(checkpoint, currentInputState) ||
      haveQualificationExecutionInputsChanged(executionEnvironment, currentExecutionEnvironment) ||
      hasDirtyInput
    ) {
      throw new Error(
        'Qualification inputs changed during execution. Start a retry so the recorded evidence uses committed source and host configuration with a new identity.',
      );
    }

    if (checkpoint.selection.adapterId !== 'custom') {
      if (checkpoint.candidate === null) {
        throw new Error('Qualification candidate identity is unavailable for baseline validation.');
      }

      const baseline = await inspectQualificationBaseline({
        candidate: checkpoint.candidate,
        executionEnvironment,
        packagesState: currentInputState.packagesState,
        qualificationDigest: currentInputState.qualificationDigest,
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
  const approvePaidExecution = async (): Promise<void> => {
    if (checkpoint.isDryRun || hasApprovedPaidExecution) {
      return;
    }

    try {
      const isApproved =
        options.requestPaidExecutionApproval === undefined
          ? false
          : await options.requestPaidExecutionApproval({
              model: executionEnvironment.model,
              modelCallCount: getQualificationModelCallCount(target.profile.cases.length),
              reasoningEffort: executionEnvironment.reasoningEffort,
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
  };

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

      const recordedResult = await recordQualificationResult(
        {
          artifactDirectory: publicDirectory,
          result: finalState.result,
          sanitizationContext: resultSanitizationContext,
        },
        resultsRoot,
      );

      return { attemptDirectory, result: recordedResult, wasRecorded: true };
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
      const wasRecorded = !checkpoint.isDryRun;
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
            executionEnvironment,
            packagesState,
            qualificationDigest,
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
      const wasRecorded = !checkpoint.isDryRun;
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

    for (const profileCase of target.profile.cases) {
      const resultStageId = `case:${profileCase.id}:result`;
      const caseArtifactDirectory = path.join(publicDirectory, 'cases', profileCase.id);
      const caseResultPath = path.join(caseArtifactDirectory, 'case-result.json');

      if (isQualificationStageComplete(checkpoint, resultStageId)) {
        caseResults.push(await readJsonFile(caseResultPath, QualificationCaseResultSchema));
        continue;
      }

      const caseStartedAt = performance.now();
      const workspaceDirectory = path.join(attemptDirectory, 'workspaces', profileCase.id);
      await rm(workspaceDirectory, { force: true, recursive: true });
      await ensureDirectory(caseArtifactDirectory);
      const prepareStageId = `case:${profileCase.id}:prepare`;
      const isPrepareComplete = isQualificationStageComplete(checkpoint, prepareStageId);

      if (!isPrepareComplete) {
        activeStageId = prepareStageId;
        checkpoint = await startQualificationStage(attemptDirectory, checkpoint, prepareStageId);
      }

      const project = await prepareQualificationProject({
        attemptDirectory,
        candidate,
        profileCase,
        profileDirectory: target.profileDirectory,
        skillRepository: checkpoint.skillRepository,
        skillState,
        signal: options.signal,
      });
      checkpoint = QualificationAttemptCheckpointSchema.parse({
        ...checkpoint,
        workspaceDirectories: {
          ...checkpoint.workspaceDirectories,
          [profileCase.id]: project.workspaceDirectory,
        },
      });

      if (!isPrepareComplete) {
        checkpoint = await completeQualificationStage(
          attemptDirectory,
          checkpoint,
          prepareStageId,
          { status: 'passed' },
        );
        activeStageId = null;
      } else {
        await writeAttemptCheckpoint(attemptDirectory, checkpoint);
      }

      const task = await readQualificationTask(project);
      const deterministicBeforeStageId = `case:${profileCase.id}:deterministic-before`;
      const deterministicBeforePath = path.join(caseArtifactDirectory, 'deterministic-before.json');
      const deterministicBefore = isQualificationStageComplete(
        checkpoint,
        deterministicBeforeStageId,
      )
        ? await readJsonFile(deterministicBeforePath, DeterministicVerificationArtifactSchema)
        : await (async () => {
            activeStageId = deterministicBeforeStageId;
            checkpoint = await startQualificationStage(
              attemptDirectory,
              checkpoint,
              deterministicBeforeStageId,
            );
            const result = await verifyDeterministicProject({
              adapterId: target.selection.adapterId,
              candidate,
              expectedEvidence: project.scenario.deterministicEvidence.before,
              expectedInspectionStatus: project.scenario.inspection.before,
              packagesRepository: checkpoint.packagesRepository,
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
            checkpoint = await completeQualificationStage(
              attemptDirectory,
              checkpoint,
              deterministicBeforeStageId,
              { status: result.summary.passed ? 'passed' : 'failed' },
            );
            activeStageId = null;
            return result;
          })();

      if (!deterministicBefore.summary.passed) {
        throw new Error(
          `Case ${profileCase.id} failed deterministic preflight: ${deterministicBefore.summary.failures.join(' ')}`,
        );
      }

      const actorStageId = `case:${profileCase.id}:actor`;
      const snapshotDirectory = path.join(
        internalDirectory,
        'cases',
        profileCase.id,
        'actor-workspace',
      );
      const actorResult = isQualificationStageComplete(checkpoint, actorStageId)
        ? await restoreActorModelStage({
            caseArtifactDirectory,
            project,
            snapshotDirectory,
          })
        : await (async () => {
            activeStageId = actorStageId;
            checkpoint = await startQualificationStage(attemptDirectory, checkpoint, actorStageId);
            const result = await executeActorModelStage({
              adapterId: target.selection.adapterId,
              approvePaidExecution,
              attemptDirectory,
              attemptId: checkpoint.attemptId,
              candidate,
              caseArtifactDirectory,
              executionEnvironment,
              host: options.host,
              implementationId: target.selection.implementationId,
              isDryRun: checkpoint.isDryRun,
              packagesRepository: checkpoint.packagesRepository,
              profileDigest: checkpoint.profileDigest,
              qualificationDigest,
              project,
              signal: options.signal,
              skillDigest: checkpoint.skillDigest,
              targetDigest: checkpoint.targetDigest,
              skillRepository: checkpoint.skillRepository,
              snapshotDirectory,
              task,
              useCache: checkpoint.useCache,
              verifyExecutionInputs,
            });
            checkpoint = await completeQualificationStage(
              attemptDirectory,
              checkpoint,
              actorStageId,
              {
                status: result.evidence.cacheSourceAttemptId === null ? 'passed' : 'cached',
                cacheKey: result.evidence.cacheKey,
                cacheSourceAttemptId: result.evidence.cacheSourceAttemptId,
              },
            );
            activeStageId = null;
            return result;
          })();

      const deterministicAfterStageId = `case:${profileCase.id}:deterministic-after`;
      const deterministicAfterPath = path.join(caseArtifactDirectory, 'deterministic-after.json');
      const deterministicAfter = isQualificationStageComplete(checkpoint, deterministicAfterStageId)
        ? await readJsonFile(deterministicAfterPath, DeterministicVerificationArtifactSchema)
        : await (async () => {
            activeStageId = deterministicAfterStageId;
            checkpoint = await startQualificationStage(
              attemptDirectory,
              checkpoint,
              deterministicAfterStageId,
            );
            const result = await verifyDeterministicProject({
              adapterId: target.selection.adapterId,
              candidate,
              expectedEvidence: project.scenario.deterministicEvidence.after,
              expectedInspectionStatus: project.scenario.inspection.after,
              packagesRepository: checkpoint.packagesRepository,
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
            checkpoint = await completeQualificationStage(
              attemptDirectory,
              checkpoint,
              deterministicAfterStageId,
              { status: result.summary.passed ? 'passed' : 'failed' },
            );
            activeStageId = null;
            return result;
          })();

      const assertionsStageId = `case:${profileCase.id}:assertions`;
      const assertionsPath = path.join(caseArtifactDirectory, 'workspace-assertions.json');
      const workspaceAssertions = isQualificationStageComplete(checkpoint, assertionsStageId)
        ? await readJsonFile(assertionsPath, WorkspaceAssertionResultSchema)
        : await (async () => {
            activeStageId = assertionsStageId;
            checkpoint = await startQualificationStage(
              attemptDirectory,
              checkpoint,
              assertionsStageId,
            );
            const result = await inspectWorkspaceAssertions(project, actorResult.output);
            await writeJsonFileAtomically(assertionsPath, result);
            checkpoint = await completeQualificationStage(
              attemptDirectory,
              checkpoint,
              assertionsStageId,
              { status: result.passed ? 'passed' : 'failed' },
            );
            activeStageId = null;
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
        path.join(caseArtifactDirectory, 'workspace.patch'),
        patchContent,
      );

      const judgeStageId = `case:${profileCase.id}:judge`;
      const judgeWorkspaceDirectory = path.join(
        internalDirectory,
        'cases',
        profileCase.id,
        'judge-workspace',
      );
      const shouldSkipJudge = !deterministicAfter.summary.passed || !workspaceAssertions.passed;
      const judgeSkippedPath = path.join(caseArtifactDirectory, 'judge-skipped.json');
      const judgeResult = shouldSkipJudge
        ? await (async () => {
            if (checkpoint.stages[judgeStageId]?.status !== 'skipped') {
              activeStageId = judgeStageId;
              checkpoint = await startQualificationStage(
                attemptDirectory,
                checkpoint,
                judgeStageId,
              );
              await writeJsonFileAtomically(
                judgeSkippedPath,
                QualificationJudgeSkippedSchema.parse({
                  reason:
                    'The judge was skipped because deterministic postchecks or workspace assertions already failed.',
                  deterministicAfterPassed: deterministicAfter.summary.passed,
                  workspaceAssertionsPassed: workspaceAssertions.passed,
                }),
              );
              checkpoint = await completeQualificationStage(
                attemptDirectory,
                checkpoint,
                judgeStageId,
                { status: 'skipped' },
              );
              activeStageId = null;
            }
            return null;
          })()
        : isQualificationStageComplete(checkpoint, judgeStageId)
          ? await restoreJudgeModelStage({
              caseArtifactDirectory,
              scenario: project.scenario,
            })
          : await (async () => {
              activeStageId = judgeStageId;
              checkpoint = await startQualificationStage(
                attemptDirectory,
                checkpoint,
                judgeStageId,
              );
              const result = await executeJudgeModelStage({
                actorOutput: actorResult.output,
                adapterId: target.selection.adapterId,
                approvePaidExecution,
                attemptDirectory,
                attemptId: checkpoint.attemptId,
                candidate,
                caseArtifactDirectory,
                executionEnvironment,
                deterministicAfter: deterministicAfter.summary,
                host: options.host,
                implementationId: target.selection.implementationId,
                isDryRun: checkpoint.isDryRun,
                judgeWorkspaceDirectory,
                packagesRepository: checkpoint.packagesRepository,
                profileDigest: checkpoint.profileDigest,
                qualificationDigest,
                project,
                signal: options.signal,
                skillDigest: checkpoint.skillDigest,
                targetDigest: checkpoint.targetDigest,
                skillRepository: checkpoint.skillRepository,
                task,
                useCache: checkpoint.useCache,
                verifyExecutionInputs,
                workspaceAssertions,
              });
              checkpoint = await completeQualificationStage(
                attemptDirectory,
                checkpoint,
                judgeStageId,
                {
                  status: result.evidence.cacheSourceAttemptId === null ? 'passed' : 'cached',
                  cacheKey: result.evidence.cacheKey,
                  cacheSourceAttemptId: result.evidence.cacheSourceAttemptId,
                },
              );
              activeStageId = null;
              return result;
            })();

      const failedJudgeRequirements =
        judgeResult?.output.requirements
          .filter(({ verdict }) => verdict === 'fail')
          .map(({ evidence, id }) => `Judge requirement ${id} failed: ${evidence}`) ?? [];
      const failures = [
        ...deterministicAfter.summary.failures,
        ...workspaceAssertions.failures,
        ...failedJudgeRequirements,
        ...(judgeResult?.output.verdict === 'fail' ? judgeResult.output.failures : []),
      ];
      const caseResult = QualificationCaseResultSchema.parse(
        sanitizeEvidenceValue(
          {
            caseId: profileCase.id,
            title: project.scenario.title,
            status: failures.length === 0 ? 'passed' : 'failed',
            durationMs: Math.max(0, Math.round(performance.now() - caseStartedAt)),
            deterministicBeforePath: `cases/${profileCase.id}/deterministic-before.json`,
            deterministicAfterPath: `cases/${profileCase.id}/deterministic-after.json`,
            actorOutputPath: `cases/${profileCase.id}/actor-output.json`,
            judgeStatus: judgeResult === null ? 'skipped' : 'completed',
            judgeOutputPath:
              judgeResult === null ? null : `cases/${profileCase.id}/judge-output.json`,
            judgeSkippedPath:
              judgeResult === null ? `cases/${profileCase.id}/judge-skipped.json` : null,
            workspaceAssertionsPath: `cases/${profileCase.id}/workspace-assertions.json`,
            patchPath: `cases/${profileCase.id}/workspace.patch`,
            actorUsage: actorResult.evidence.usage,
            judgeUsage: judgeResult?.evidence.usage ?? null,
            actorEvidenceCreatedAt: actorResult.evidence.createdAt,
            judgeEvidenceCreatedAt: judgeResult?.evidence.createdAt ?? null,
            actorCacheSourceAttemptId: actorResult.evidence.cacheSourceAttemptId,
            judgeCacheSourceAttemptId: judgeResult?.evidence.cacheSourceAttemptId ?? null,
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
      activeStageId = resultStageId;
      checkpoint = await startQualificationStage(attemptDirectory, checkpoint, resultStageId);
      await writeJsonFileAtomically(caseResultPath, caseResult);
      checkpoint = await completeQualificationStage(attemptDirectory, checkpoint, resultStageId, {
        status: 'passed',
      });
      activeStageId = null;
      caseResults.push(caseResult);
    }

    await verifyExecutionInputs();

    const hasFailedCase = caseResults.some(({ status }) => status !== 'passed');
    const finalState = await persistFinalState({
      attemptDirectory,
      caseResults,
      checkpoint,
      provenance,
      stageIds,
      status: hasFailedCase ? 'failed' : 'passed',
      summary: hasFailedCase
        ? 'Qualification completed with one or more failed cases.'
        : 'Qualification passed every deterministic and semantic case.',
    });
    const wasRecorded = !checkpoint.isDryRun;
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
    const isInterrupted = options.signal?.aborted === true || isApprovalDeclined;
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

    if (isInterrupted) {
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
          : 'Qualification was interrupted and can be resumed from its last atomic checkpoint.'
        : `Qualification stopped with an execution error: ${safeError}`,
    });
    const wasRecorded = !checkpoint.isDryRun && !isInterrupted;
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
};
