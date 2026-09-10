import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import {
  runCodexEvaluationOperationalStage,
  type ICodexEvaluationOperationalExhaustion,
  type ICodexEvaluationOperationalRetry,
} from '../../../tooling/codex-evaluation-host/index.mjs';

import type { ICodexHost } from '../codex-host/index.ts';
import {
  ActorOutputSchema,
  JudgeOutputSchema,
  QualificationModelStageEvidenceSchema,
  QualificationProjectedExecutionEventSchema,
  type IActorOutput,
  type ICandidateClosure,
  type IDeterministicVerification,
  type IJudgeOutput,
  type IModelUsage,
  type IQualificationCommandPolicyEvidence,
  type IQualificationExecutionEnvironment,
  type IQualificationTrialResult,
  type IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import {
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
  QUALIFICATION_MAXIMUM_OPERATIONAL_RETRY_COUNT,
} from '../constants/index.ts';
import {
  calculateDirectoryFingerprint,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import {
  applyExpectedDryRunState,
  assertQualificationProjectInputIntegrity,
  captureQualificationProjectSnapshot,
  inspectWorkspaceAssertions,
  MOUNTED_SKILL_RELATIVE_PATH,
  QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES,
  restoreQualificationProjectSnapshot,
  type IPreparedQualificationProject,
} from '../project-fixture/index.ts';
import { buildActorPrompt, buildJudgePrompt } from '../prompts/index.ts';
import { sanitizeEvidenceText, sanitizeEvidenceValue } from '../result/index.ts';
import { calculateModelStageIdentity } from './model-stage-identity.ts';
import { validateJudgeOutput } from './validations.ts';
import { prepareJudgeWorkspace } from './workspaces.ts';
import type { IQualificationOperationalRetryOptions } from './types.ts';

export type IModelStageEvidence = z.infer<typeof QualificationModelStageEvidenceSchema>;

export type IActorStageResult = {
  output: IActorOutput;
  evidence: IModelStageEvidence & { role: 'actor' };
};

export type IJudgeStageResult = {
  output: IJudgeOutput;
  evidence: IModelStageEvidence & { role: 'judge' };
};

type ISharedModelStageOptions = {
  adapterId: string;
  approvePaidExecution: () => Promise<void>;
  reservePaidExecution?: () => Promise<void>;
  settlePaidExecution?: (usage: IModelUsage | null) => Promise<void>;
  attemptId: string;
  attemptDirectory: string;
  candidate: ICandidateClosure;
  caseArtifactDirectory: string;
  executionEnvironment: IQualificationExecutionEnvironment;
  host: ICodexHost;
  implementationId: string;
  isDryRun: boolean;
  modelHostDigest: string;
  packagesRepository: string;
  profileDigest: string;
  qualificationDigest: string;
  baselineAttemptId: string | null;
  project: IPreparedQualificationProject;
  signal?: AbortSignal | undefined;
  skillDigest: string;
  targetDigest: string;
  skillRepository: string;
  task: string;
  trialId: IQualificationTrialResult['trialId'];
  initialOperationalFailureCount?: number;
  onStageIdentity?: (stageIdentity: string) => Promise<void>;
  onOperationalRetry?: (retry: ICodexEvaluationOperationalRetry) => Promise<void>;
  onOperationalStop?: (stop: ICodexEvaluationOperationalExhaustion) => Promise<void>;
  operationalRetry?: IQualificationOperationalRetryOptions;
  runWithTemporaryStorageGuard?: <TResult>(
    operation: (signal: AbortSignal) => Promise<TResult>,
  ) => Promise<TResult>;
  verifyExecutionInputs: () => Promise<void>;
};

const getProjectFingerprint = (project: IPreparedQualificationProject): Promise<string> =>
  calculateDirectoryFingerprint(project.workspaceDirectory, {
    excludedDirectoryNames: new Set(QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES),
    excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
  });

/** Validates the complete safe JSONL projection before it reaches durable storage. */
const validateProjectedEvents = (events: string): string => {
  for (const eventLine of events.split('\n')) {
    if (eventLine.trim() !== '') {
      QualificationProjectedExecutionEventSchema.parse(JSON.parse(eventLine) as unknown);
    }
  }
  return events;
};

const writeModelArtifacts = async <TOutput>(options: {
  context: ISharedModelStageOptions;
  evidence: IModelStageEvidence;
  events: string;
  output: TOutput;
  prompt: string;
  role: 'actor' | 'judge';
}): Promise<void> => {
  const sanitizationContext = {
    attemptDirectory: options.context.attemptDirectory,
    packagesRepository: options.context.packagesRepository,
    skillRepository: options.context.skillRepository,
    workspaceDirectory: options.context.project.workspaceDirectory,
  };
  const projectedEvents = validateProjectedEvents(options.events);

  await Promise.all([
    writeJsonFileAtomically(
      path.join(options.context.caseArtifactDirectory, `${options.role}-output.json`),
      sanitizeEvidenceValue(options.output, sanitizationContext),
    ),
    writeJsonFileAtomically(
      path.join(options.context.caseArtifactDirectory, `${options.role}-evidence.json`),
      options.evidence,
    ),
    writeTextFileAtomically(
      path.join(options.context.caseArtifactDirectory, `${options.role}-events.jsonl`),
      sanitizeEvidenceText(projectedEvents, sanitizationContext),
    ),
    writeTextFileAtomically(
      path.join(options.context.caseArtifactDirectory, `${options.role}-prompt.md`),
      `${sanitizeEvidenceText(options.prompt, sanitizationContext).trim()}\n`,
    ),
    writeJsonFileAtomically(
      path.join(options.context.caseArtifactDirectory, `${options.role}-output.schema.json`),
      z.toJSONSchema(options.role === 'actor' ? ActorOutputSchema : JudgeOutputSchema),
    ),
  ]);
};

/** Executes or exactly restores the actor model stage and captures its post-actor workspace. */
export const executeActorModelStage = async (
  options: ISharedModelStageOptions & {
    restorePreActorState?: () => Promise<void>;
    snapshotDirectory: string;
  },
): Promise<IActorStageResult> => {
  const prompt = buildActorPrompt({
    task: options.task,
  });
  const stageIdentity = calculateModelStageIdentity({
    protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    role: 'actor',
    executionEnvironment: options.executionEnvironment,
    candidateFingerprint: options.candidate.fingerprint,
    modelHostDigest: options.modelHostDigest,
    outputSchema: z.toJSONSchema(ActorOutputSchema),
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
    baselineAttemptId: options.baselineAttemptId,
    skillDigest: options.skillDigest,
    targetDigest: options.targetDigest,
    caseId: options.project.scenario.id,
    trialId: options.trialId,
    projectFingerprint: await getProjectFingerprint(options.project),
    prompt,
  });
  await options.onStageIdentity?.(stageIdentity);
  const execution = await runCodexEvaluationOperationalStage({
    initialFailureCount: options.initialOperationalFailureCount ?? 0,
    maximumRetryCount: QUALIFICATION_MAXIMUM_OPERATIONAL_RETRY_COUNT,
    ...(options.operationalRetry?.now === undefined ? {} : { now: options.operationalRetry.now }),
    onRetry: options.onOperationalRetry ?? (() => Promise.resolve()),
    onExhausted: options.onOperationalStop ?? (() => Promise.resolve()),
    operation: async () => {
      if (!options.isDryRun) {
        await options.verifyExecutionInputs();
      }
      await options.restorePreActorState?.();
      let dryRunChangedFiles: string[] | undefined;

      if (options.isDryRun) {
        await applyExpectedDryRunState(options.project);
        dryRunChangedFiles = (await inspectWorkspaceAssertions(options.project)).changedPaths;
      } else {
        await options.approvePaidExecution();
      }

      let actorExecution;

      if (!options.isDryRun) {
        await options.reservePaidExecution?.();
      }

      try {
        const runActor = (signal: AbortSignal | undefined) =>
          options.host.runActor({
            caseId: options.project.scenario.id,
            ...(dryRunChangedFiles === undefined ? {} : { dryRunChangedFiles }),
            prompt,
            scenario: options.project.scenario,
            schema: ActorOutputSchema,
            signal,
            workspaceDirectory: options.project.workspaceDirectory,
          });
        actorExecution =
          options.runWithTemporaryStorageGuard === undefined
            ? await runActor(options.signal)
            : await options.runWithTemporaryStorageGuard(runActor);
      } catch (error) {
        if (!options.isDryRun) {
          await options.settlePaidExecution?.(null);
        }
        throw error;
      }

      if (!options.isDryRun) {
        await options.settlePaidExecution?.(actorExecution.usage);
      }

      if (!options.isDryRun) {
        await options.verifyExecutionInputs();
      }

      return actorExecution;
    },
    ...(options.operationalRetry?.random === undefined
      ? {}
      : { random: options.operationalRetry.random }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.operationalRetry?.wait === undefined
      ? {}
      : { wait: options.operationalRetry.wait }),
  });
  const output = ActorOutputSchema.parse(
    sanitizeEvidenceValue(execution.output, {
      attemptDirectory: options.attemptDirectory,
      packagesRepository: options.packagesRepository,
      skillRepository: options.skillRepository,
      workspaceDirectory: options.project.workspaceDirectory,
    }),
  );
  const usage = execution.usage;
  const durationMs = execution.durationMs;
  const events = execution.events;
  const createdAt = new Date().toISOString();
  const commandPolicy = execution.commandPolicy;

  await assertQualificationProjectInputIntegrity(options.project);

  await rm(options.snapshotDirectory, { force: true, recursive: true });
  await captureQualificationProjectSnapshot(options.project, options.snapshotDirectory);
  const evidence = QualificationModelStageEvidenceSchema.parse({
    role: 'actor',
    createdAt,
    durationMs,
    usage,
    stageIdentity,
    sourceAttemptId: options.attemptId,
    reuseSourceAttemptId: null,
    trialId: options.trialId,
    commandPolicy,
  }) as IActorStageResult['evidence'];
  await writeModelArtifacts({ context: options, evidence, events, output, prompt, role: 'actor' });

  return { output, evidence };
};

/** Restores a completed local actor stage during interruption-safe resume. */
export const restoreActorModelStage = async (options: {
  caseArtifactDirectory: string;
  project: IPreparedQualificationProject;
  snapshotDirectory: string;
}): Promise<IActorStageResult> => {
  await restoreQualificationProjectSnapshot(options.project, options.snapshotDirectory);
  await assertQualificationProjectInputIntegrity(options.project);
  const output = await readJsonFile(
    path.join(options.caseArtifactDirectory, 'actor-output.json'),
    ActorOutputSchema,
  );
  const evidence = QualificationModelStageEvidenceSchema.parse(
    JSON.parse(
      await readFile(path.join(options.caseArtifactDirectory, 'actor-evidence.json'), 'utf8'),
    ) as unknown,
  );

  if (evidence.role !== 'actor') {
    throw new Error('Stored actor evidence has the wrong role.');
  }

  return { output, evidence: { ...evidence, role: 'actor' } };
};

/** Executes or exactly restores the independent judge model stage. */
export const executeJudgeModelStage = async (
  options: ISharedModelStageOptions & {
    actorCommandPolicy: IQualificationCommandPolicyEvidence;
    actorOutput: IActorOutput;
    deterministicAfter: IDeterministicVerification;
    judgeWorkspaceDirectory: string;
    workspaceAssertions: IWorkspaceAssertionResult;
  },
): Promise<IJudgeStageResult> => {
  const prompt = buildJudgePrompt({
    actorCommandPolicy: options.actorCommandPolicy,
    actorOutput: options.actorOutput,
    adapterId: options.adapterId,
    deterministicAfter: options.deterministicAfter,
    implementationId: options.implementationId,
    scenario: options.project.scenario,
    task: options.task,
    workspaceAssertions: options.workspaceAssertions,
  });
  const stageIdentity = calculateModelStageIdentity({
    protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    role: 'judge',
    executionEnvironment: options.executionEnvironment,
    candidateFingerprint: options.candidate.fingerprint,
    modelHostDigest: options.modelHostDigest,
    outputSchema: z.toJSONSchema(JudgeOutputSchema),
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
    baselineAttemptId: options.baselineAttemptId,
    skillDigest: options.skillDigest,
    targetDigest: options.targetDigest,
    caseId: options.project.scenario.id,
    trialId: options.trialId,
    projectFingerprint: await getProjectFingerprint(options.project),
    prompt,
  });
  await options.onStageIdentity?.(stageIdentity);
  const execution = await runCodexEvaluationOperationalStage({
    initialFailureCount: options.initialOperationalFailureCount ?? 0,
    maximumRetryCount: QUALIFICATION_MAXIMUM_OPERATIONAL_RETRY_COUNT,
    ...(options.operationalRetry?.now === undefined ? {} : { now: options.operationalRetry.now }),
    onRetry: options.onOperationalRetry ?? (() => Promise.resolve()),
    onExhausted: options.onOperationalStop ?? (() => Promise.resolve()),
    operation: async () => {
      if (!options.isDryRun) {
        await options.verifyExecutionInputs();
      }
      const judgeWorkspaceFingerprint = await prepareJudgeWorkspace(
        options.project.workspaceDirectory,
        options.judgeWorkspaceDirectory,
      );

      if (!options.isDryRun) {
        await options.approvePaidExecution();
      }

      await options.reservePaidExecution?.();
      let judgeExecution;

      try {
        const runJudge = (signal: AbortSignal | undefined) =>
          options.host.runJudge({
            caseId: options.project.scenario.id,
            prompt,
            scenario: options.project.scenario,
            schema: JudgeOutputSchema,
            signal,
            workspaceDirectory: options.judgeWorkspaceDirectory,
          });
        judgeExecution =
          options.runWithTemporaryStorageGuard === undefined
            ? await runJudge(options.signal)
            : await options.runWithTemporaryStorageGuard(runJudge);
      } catch (error) {
        await options.settlePaidExecution?.(null);
        throw error;
      }

      await options.settlePaidExecution?.(judgeExecution.usage);

      if (!options.isDryRun) {
        await options.verifyExecutionInputs();
      }

      const postJudgeWorkspaceFingerprint = await calculateDirectoryFingerprint(
        options.judgeWorkspaceDirectory,
      );

      if (postJudgeWorkspaceFingerprint !== judgeWorkspaceFingerprint) {
        throw new Error('The read-only judge modified its independent workspace.');
      }

      return judgeExecution;
    },
    ...(options.operationalRetry?.random === undefined
      ? {}
      : { random: options.operationalRetry.random }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.operationalRetry?.wait === undefined
      ? {}
      : { wait: options.operationalRetry.wait }),
  });
  const output = validateJudgeOutput(
    options.project.scenario,
    JudgeOutputSchema.parse(
      sanitizeEvidenceValue(execution.output, {
        attemptDirectory: options.attemptDirectory,
        packagesRepository: options.packagesRepository,
        skillRepository: options.skillRepository,
        workspaceDirectory: options.project.workspaceDirectory,
      }),
    ),
  );
  const usage = execution.usage;
  const durationMs = execution.durationMs;
  const events = execution.events;
  const createdAt = new Date().toISOString();
  const commandPolicy = execution.commandPolicy;

  const evidence = QualificationModelStageEvidenceSchema.parse({
    role: 'judge',
    createdAt,
    durationMs,
    usage,
    stageIdentity,
    sourceAttemptId: options.attemptId,
    reuseSourceAttemptId: null,
    trialId: options.trialId,
    commandPolicy,
  }) as IJudgeStageResult['evidence'];
  await writeModelArtifacts({ context: options, evidence, events, output, prompt, role: 'judge' });

  return { output, evidence };
};

/** Loads a completed local judge stage during interruption-safe resume. */
export const restoreJudgeModelStage = async (options: {
  caseArtifactDirectory: string;
  scenario: IPreparedQualificationProject['scenario'];
}): Promise<IJudgeStageResult> => {
  const output = await readJsonFile(
    path.join(options.caseArtifactDirectory, 'judge-output.json'),
    JudgeOutputSchema,
  );
  const evidence = await readJsonFile(
    path.join(options.caseArtifactDirectory, 'judge-evidence.json'),
    QualificationModelStageEvidenceSchema,
  );

  if (evidence.role !== 'judge') {
    throw new Error('Stored judge evidence has the wrong role.');
  }

  return {
    output: validateJudgeOutput(options.scenario, output),
    evidence: { ...evidence, role: 'judge' },
  };
};
