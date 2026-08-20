import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import {
  calculateModelCacheKey,
  readActorCache,
  readJudgeCache,
  writeActorCache,
  writeJudgeCache,
} from '../cache/index.ts';
import type { ICodexHost } from '../codex-host/index.ts';
import {
  ActorOutputSchema,
  JudgeOutputSchema,
  ModelUsageSchema,
  type IActorOutput,
  type ICandidateClosure,
  type IDeterministicVerification,
  type IJudgeOutput,
  type IModelUsage,
  type IWorkspaceAssertionResult,
} from '../contracts/index.ts';
import {
  calculateDirectoryFingerprint,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import {
  applyExpectedDryRunState,
  assertCandidateProjectRuntimeIntegrity,
  captureQualificationProjectSnapshot,
  MOUNTED_SKILL_RELATIVE_PATH,
  QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES,
  restoreQualificationProjectSnapshot,
  type IPreparedQualificationProject,
} from '../project-fixture/index.ts';
import { buildActorPrompt, buildJudgePrompt } from '../prompts/index.ts';
import { sanitizeEvidenceText, sanitizeEvidenceValue } from '../result/index.ts';
import { createCodexEnvironment } from '../sandbox/index.ts';
import { validateJudgeOutput } from './validations.ts';

const ModelStageEvidenceSchema = z.strictObject({
  role: z.enum(['actor', 'judge']),
  createdAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative(),
  usage: ModelUsageSchema.nullable(),
  cacheKey: z.string().regex(/^[a-f0-9]{64}$/u),
  sourceAttemptId: z.string().min(1),
  cacheSourceAttemptId: z.string().min(1).nullable(),
});

export type IModelStageEvidence = z.infer<typeof ModelStageEvidenceSchema>;

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
  attemptId: string;
  candidate: ICandidateClosure;
  caseArtifactDirectory: string;
  codexVersion: string;
  host: ICodexHost;
  implementationId: string;
  isDryRun: boolean;
  packagesRepository: string;
  profileDigest: string;
  qualificationDigest: string;
  project: IPreparedQualificationProject;
  signal?: AbortSignal | undefined;
  skillDigest: string;
  skillRepository: string;
  task: string;
  useCache: boolean;
};

const getProjectFingerprint = (project: IPreparedQualificationProject): Promise<string> =>
  calculateDirectoryFingerprint(project.workspaceDirectory, {
    excludedDirectoryNames: new Set(QUALIFICATION_WORKSPACE_EXCLUDED_DIRECTORY_NAMES),
    excludedRelativePathPrefixes: [MOUNTED_SKILL_RELATIVE_PATH],
  });

const writeModelArtifacts = async <TOutput>(options: {
  context: ISharedModelStageOptions;
  evidence: IModelStageEvidence;
  events: string;
  output: TOutput;
  prompt: string;
  role: 'actor' | 'judge';
}): Promise<void> => {
  const sanitizationContext = {
    packagesRepository: options.context.packagesRepository,
    skillRepository: options.context.skillRepository,
    workspaceDirectory: options.context.project.workspaceDirectory,
  };

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
      sanitizeEvidenceText(options.events, sanitizationContext),
    ),
    writeTextFileAtomically(
      path.join(options.context.caseArtifactDirectory, `${options.role}-prompt.md`),
      `${options.prompt.trim()}\n`,
    ),
  ]);
};

/** Executes or exactly restores the Terra actor stage and captures its post-actor workspace. */
export const executeActorModelStage = async (
  options: ISharedModelStageOptions & { snapshotDirectory: string },
): Promise<IActorStageResult> => {
  const prompt = buildActorPrompt({
    task: options.task,
  });
  const cacheKey = calculateModelCacheKey({
    role: 'actor',
    model: 'gpt-5.6-terra',
    reasoningEffort: 'medium',
    codexVersion: options.codexVersion,
    candidateFingerprint: options.candidate.fingerprint,
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
    skillDigest: options.skillDigest,
    caseId: options.project.scenario.id,
    projectFingerprint: await getProjectFingerprint(options.project),
    prompt,
  });
  const cacheHit =
    options.useCache && !options.isDryRun
      ? await readActorCache(cacheKey, options.project.workspaceDirectory)
      : null;
  let output: IActorOutput;
  let usage: IModelUsage | null;
  let durationMs: number;
  let events: string;
  let createdAt: string;
  let sourceAttemptId: string;
  let cacheSourceAttemptId: string | null;

  if (cacheHit !== null) {
    output = cacheHit.output;
    usage = cacheHit.metadata.usage;
    durationMs = cacheHit.metadata.durationMs;
    events = cacheHit.events;
    createdAt = cacheHit.metadata.createdAt;
    sourceAttemptId = cacheHit.metadata.sourceAttemptId;
    cacheSourceAttemptId = cacheHit.metadata.sourceAttemptId;
  } else {
    if (options.isDryRun) {
      await applyExpectedDryRunState(options.project);
    }

    const execution = await options.host.runActor({
      artifactDirectory: options.caseArtifactDirectory,
      caseId: options.project.scenario.id,
      environment: createCodexEnvironment(options.project.workspaceDirectory),
      prompt,
      scenario: options.project.scenario,
      schema: ActorOutputSchema,
      signal: options.signal,
      workspaceDirectory: options.project.workspaceDirectory,
    });
    output = execution.output;
    usage = execution.usage;
    durationMs = execution.durationMs;
    events = execution.events;
    createdAt = new Date().toISOString();
    sourceAttemptId = options.attemptId;
    cacheSourceAttemptId = null;
  }

  await assertCandidateProjectRuntimeIntegrity(options.project);

  if (cacheHit === null && options.useCache && !options.isDryRun) {
    await writeActorCache({
      cacheKey,
      sourceAttemptId: options.attemptId,
      output,
      durationMs,
      events,
      usage,
      workspaceDirectory: options.project.workspaceDirectory,
    });
  }

  await rm(options.snapshotDirectory, { force: true, recursive: true });
  await captureQualificationProjectSnapshot(options.project, options.snapshotDirectory);
  const evidence = ModelStageEvidenceSchema.parse({
    role: 'actor',
    createdAt,
    durationMs,
    usage,
    cacheKey,
    sourceAttemptId,
    cacheSourceAttemptId,
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
  await assertCandidateProjectRuntimeIntegrity(options.project);
  const output = await readJsonFile(
    path.join(options.caseArtifactDirectory, 'actor-output.json'),
    ActorOutputSchema,
  );
  const evidence = ModelStageEvidenceSchema.parse(
    JSON.parse(
      await readFile(path.join(options.caseArtifactDirectory, 'actor-evidence.json'), 'utf8'),
    ) as unknown,
  );

  if (evidence.role !== 'actor') {
    throw new Error('Stored actor evidence has the wrong role.');
  }

  return { output, evidence: { ...evidence, role: 'actor' } };
};

/** Executes or exactly restores the independent Terra judge stage. */
export const executeJudgeModelStage = async (
  options: ISharedModelStageOptions & {
    actorOutput: IActorOutput;
    deterministicAfter: IDeterministicVerification;
    workspaceAssertions: IWorkspaceAssertionResult;
  },
): Promise<IJudgeStageResult> => {
  const prompt = buildJudgePrompt({
    actorOutput: options.actorOutput,
    adapterId: options.adapterId,
    deterministicAfter: options.deterministicAfter,
    implementationId: options.implementationId,
    scenario: options.project.scenario,
    task: options.task,
    workspaceAssertions: options.workspaceAssertions,
  });
  const cacheKey = calculateModelCacheKey({
    role: 'judge',
    model: 'gpt-5.6-terra',
    reasoningEffort: 'medium',
    codexVersion: options.codexVersion,
    candidateFingerprint: options.candidate.fingerprint,
    profileDigest: options.profileDigest,
    qualificationDigest: options.qualificationDigest,
    skillDigest: options.skillDigest,
    caseId: options.project.scenario.id,
    projectFingerprint: await getProjectFingerprint(options.project),
    prompt,
  });
  const cacheHit = options.useCache && !options.isDryRun ? await readJudgeCache(cacheKey) : null;
  let output: IJudgeOutput;
  let usage: IModelUsage | null;
  let durationMs: number;
  let events: string;
  let createdAt: string;
  let sourceAttemptId: string;
  let cacheSourceAttemptId: string | null;

  if (cacheHit !== null) {
    output = validateJudgeOutput(options.project.scenario, cacheHit.output);
    usage = cacheHit.metadata.usage;
    durationMs = cacheHit.metadata.durationMs;
    events = cacheHit.events;
    createdAt = cacheHit.metadata.createdAt;
    sourceAttemptId = cacheHit.metadata.sourceAttemptId;
    cacheSourceAttemptId = cacheHit.metadata.sourceAttemptId;
  } else {
    const execution = await options.host.runJudge({
      artifactDirectory: options.caseArtifactDirectory,
      caseId: options.project.scenario.id,
      environment: createCodexEnvironment(options.project.workspaceDirectory),
      prompt,
      scenario: options.project.scenario,
      schema: JudgeOutputSchema,
      signal: options.signal,
      workspaceDirectory: options.project.workspaceDirectory,
    });
    output = validateJudgeOutput(options.project.scenario, execution.output);
    usage = execution.usage;
    durationMs = execution.durationMs;
    events = execution.events;
    createdAt = new Date().toISOString();
    sourceAttemptId = options.attemptId;
    cacheSourceAttemptId = null;

    if (options.useCache && !options.isDryRun) {
      await writeJudgeCache({
        cacheKey,
        sourceAttemptId: options.attemptId,
        output,
        durationMs,
        events,
        usage,
      });
    }
  }

  const evidence = ModelStageEvidenceSchema.parse({
    role: 'judge',
    createdAt,
    durationMs,
    usage,
    cacheKey,
    sourceAttemptId,
    cacheSourceAttemptId,
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
    ModelStageEvidenceSchema,
  );

  if (evidence.role !== 'judge') {
    throw new Error('Stored judge evidence has the wrong role.');
  }

  return {
    output: validateJudgeOutput(options.scenario, output),
    evidence: { ...evidence, role: 'judge' },
  };
};
