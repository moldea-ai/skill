import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { createPublicCandidatePackage } from '../candidate-closure/index.ts';
import { writeAttemptCheckpoint } from '../checkpoint/index.ts';
import {
  QualificationAttemptCheckpointSchema,
  QualificationAttemptResultSchema,
  QualificationCaseResultSchema,
  QualificationModelStageEvidenceSchema,
  QualificationTrialResultSchema,
  type ICandidateClosure,
  type IQualificationAttemptCheckpoint,
  type IQualificationAttemptResult,
  type IQualificationExecutionEnvironment,
  type IQualificationStageCheckpoint,
} from '../contracts/index.ts';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import { validateQualificationAttemptEvidence } from '../result/index.ts';
import {
  createQualificationAttemptKey,
  isQualificationAttemptCommitted,
  resolveQualificationArtifactPath,
  resolveQualificationResultTargetDirectory,
  verifyQualificationAttemptStorage,
} from '../storage/index.ts';
import type { IReusableQualificationCase } from './types.ts';

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await readFile(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const createPublicPackages = (candidate: ICandidateClosure) =>
  [...candidate.packages, ...(candidate.runtimePackages ?? []), candidate.typeScriptPackage].map(
    createPublicCandidatePackage,
  );

const selectExecutionEnvironment = (
  result: IReusableQualificationCase['result'],
): IQualificationExecutionEnvironment => ({
  model: result.provenance.model,
  reasoningEffort: result.provenance.reasoningEffort,
  codexVersion: result.provenance.codexVersion,
  nodeVersion: result.provenance.nodeVersion,
  pnpmVersion: result.provenance.pnpmVersion,
  gitVersion: result.provenance.gitVersion,
  allowedEgressHosts: result.provenance.allowedEgressHosts,
  hostTimeoutMs: result.provenance.hostTimeoutMs,
  modelEndpoint: result.provenance.modelEndpoint,
  sslCertificateFileSha256: result.provenance.sslCertificateFileSha256,
});

const hasExactIdentity = (options: {
  baselineAttemptId: string | null;
  candidate: ICandidateClosure;
  checkpoint: IQualificationAttemptCheckpoint;
  executionEnvironment: IQualificationExecutionEnvironment;
  packagesRepositoryCommit: string;
  result: IQualificationAttemptResult;
}): boolean => {
  const { checkpoint, result } = options;
  return (
    result.mode === 'official' &&
    result.status === 'failed' &&
    result.selection.adapterId === checkpoint.selection.adapterId &&
    result.selection.implementationId === checkpoint.selection.implementationId &&
    result.provenance.candidateFingerprint === options.candidate.fingerprint &&
    result.provenance.packagesRepositoryCommit === options.packagesRepositoryCommit &&
    result.provenance.packagesRepositoryFingerprint === checkpoint.packagesRepositoryFingerprint &&
    result.provenance.profileDigest === checkpoint.profileDigest &&
    result.provenance.qualificationDigest === checkpoint.qualificationDigest &&
    result.provenance.skillRepositoryFingerprint === checkpoint.skillDigest &&
    result.provenance.targetDigest === checkpoint.targetDigest &&
    result.provenance.baselineAttemptId === options.baselineAttemptId &&
    result.cases.every(
      (caseResult) =>
        caseResult.reuse === null &&
        caseResult.trials.every(
          (trial) =>
            trial.actorReuseSourceAttemptId === null && trial.judgeReuseSourceAttemptId === null,
        ),
    ) &&
    JSON.stringify(result.provenance.packages) ===
      JSON.stringify(createPublicPackages(options.candidate)) &&
    JSON.stringify(selectExecutionEnvironment(result)) ===
      JSON.stringify(options.executionEnvironment)
  );
};

/** Finds exact committed passing groups without admitting failed or partial case history. */
export const loadReusableQualificationCases = async (options: {
  baselineAttemptId: string | null;
  candidate: ICandidateClosure;
  caseIds: readonly string[];
  checkpoint: IQualificationAttemptCheckpoint;
  executionEnvironment: IQualificationExecutionEnvironment;
  packagesRepositoryCommit: string;
  qualificationRepositoryCommit: string;
  repositoryRoot: string;
  resultsRoot: string;
}): Promise<Map<string, IReusableQualificationCase>> => {
  const targetRoot = await resolveQualificationResultTargetDirectory(
    options.resultsRoot,
    options.checkpoint.selection,
  );
  const attemptsRoot = path.join(targetRoot, 'attempts');

  if (!(await pathExists(path.join(targetRoot, 'latest.json')))) {
    return new Map();
  }

  const entries = await readdir(attemptsRoot, { withFileTypes: true });
  const candidates: IReusableQualificationCase[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^a-[a-f0-9]{32}$/u.test(entry.name)) {
      continue;
    }

    const attemptDirectory = path.join(attemptsRoot, entry.name);

    try {
      const result = await readJsonFile(
        path.join(attemptDirectory, 'attempt.json'),
        QualificationAttemptResultSchema,
      );

      if (
        createQualificationAttemptKey(result.attemptId) !== entry.name ||
        !hasExactIdentity({
          baselineAttemptId: options.baselineAttemptId,
          candidate: options.candidate,
          checkpoint: options.checkpoint,
          executionEnvironment: options.executionEnvironment,
          packagesRepositoryCommit: options.packagesRepositoryCommit,
          result,
        }) ||
        !(await isQualificationAttemptCommitted({
          attemptDirectory,
          commit: options.qualificationRepositoryCommit,
          repositoryRoot: options.repositoryRoot,
        }))
      ) {
        continue;
      }

      const storage = await verifyQualificationAttemptStorage({ attemptDirectory, result });
      await validateQualificationAttemptEvidence({
        attemptDirectory,
        result,
        resultsRoot: options.resultsRoot,
      });

      for (const caseResult of result.cases) {
        if (
          options.caseIds.includes(caseResult.caseId) &&
          (caseResult.status === 'passed' || caseResult.status === 'recovered') &&
          caseResult.trials.every(
            (trial) =>
              trial.actorReuseSourceAttemptId === null && trial.judgeReuseSourceAttemptId === null,
          )
        ) {
          candidates.push({
            attemptDirectory,
            caseResult,
            result,
            sourceCommit: options.qualificationRepositoryCommit,
            storage,
          });
        }
      }
    } catch {
      continue;
    }
  }

  candidates.sort(
    (left, right) =>
      right.result.createdAt.localeCompare(left.result.createdAt, 'en') ||
      right.result.attemptId.localeCompare(left.result.attemptId, 'en'),
  );
  const reusableCases = new Map<string, IReusableQualificationCase>();

  for (const candidate of candidates) {
    if (!reusableCases.has(candidate.caseResult.caseId)) {
      reusableCases.set(candidate.caseResult.caseId, candidate);
    }
  }

  return reusableCases;
};

const createReusedTrial = (
  trial: IReusableQualificationCase['caseResult']['trials'][number],
  sourceAttemptId: string,
) =>
  QualificationTrialResultSchema.parse({
    ...trial,
    actorReuseSourceAttemptId: sourceAttemptId,
    judgeReuseSourceAttemptId: trial.judgeStatus === 'completed' ? sourceAttemptId : null,
  });

/** Materializes one complete reusable case and atomically marks its stages as reused. */
export const materializeReusableQualificationCase = async (options: {
  attemptDirectory: string;
  checkpoint: IQualificationAttemptCheckpoint;
  publicDirectory: string;
  reusableCase: IReusableQualificationCase;
}): Promise<{
  caseResult: IReusableQualificationCase['caseResult'];
  checkpoint: IQualificationAttemptCheckpoint;
}> => {
  const { reusableCase } = options;
  const sourceAttemptId = reusableCase.result.attemptId;
  const casePrefix = `cases/${reusableCase.caseResult.caseId}/`;
  const destinationCaseDirectory = path.join(
    options.publicDirectory,
    'cases',
    reusableCase.caseResult.caseId,
  );
  const caseResult = QualificationCaseResultSchema.parse({
    ...reusableCase.caseResult,
    reuse: {
      sourceAttemptId,
      sourceCommit: reusableCase.sourceCommit,
      sourceAttemptDigest: reusableCase.storage.attemptDigest,
    },
    trials: reusableCase.caseResult.trials.map((trial) =>
      createReusedTrial(trial, sourceAttemptId),
    ),
  });
  await rm(destinationCaseDirectory, { force: true, recursive: true });
  await ensureDirectory(destinationCaseDirectory);

  for (const artifact of reusableCase.storage.artifacts) {
    if (!artifact.logicalPath.startsWith(casePrefix)) {
      continue;
    }

    const sourcePath = resolveQualificationArtifactPath(
      reusableCase.attemptDirectory,
      reusableCase.storage,
      artifact.logicalPath,
    );
    const destinationPath = path.join(options.publicDirectory, artifact.logicalPath);
    const trialMatch = artifact.logicalPath.match(
      /^cases\/[^/]+\/trials\/(initial|confirmation-[12])\/(actor|judge)-evidence\.json$/u,
    );

    if (artifact.logicalPath.endsWith('/case-result.json')) {
      await writeJsonFileAtomically(destinationPath, caseResult);
    } else if (artifact.logicalPath.endsWith('/trial-result.json')) {
      const trialId = artifact.logicalPath.split('/').at(-2);
      const trial = caseResult.trials.find((candidate) => candidate.trialId === trialId);

      if (trial === undefined) {
        throw new Error(`Reusable case is missing trial ${trialId ?? '<unknown>'}.`);
      }
      await writeJsonFileAtomically(destinationPath, trial);
    } else if (trialMatch !== null) {
      const evidence = await readJsonFile(sourcePath, QualificationModelStageEvidenceSchema);
      await writeJsonFileAtomically(destinationPath, {
        ...evidence,
        reuseSourceAttemptId: sourceAttemptId,
      });
    } else {
      await ensureDirectory(path.dirname(destinationPath));
      await writeTextFileAtomically(destinationPath, await readFile(sourcePath, 'utf8'));
    }
  }

  const sourceStages = new Map(reusableCase.result.stages.map((stage) => [stage.id, stage]));
  const caseStagePrefix = `case:${reusableCase.caseResult.caseId}:`;
  const ownedStageIds = reusableCase.result.stages
    .map(({ id }) => id)
    .filter((stageId) => stageId.startsWith(caseStagePrefix));
  const stages = { ...options.checkpoint.stages };

  for (const stageId of ownedStageIds) {
    const sourceStage = sourceStages.get(stageId);

    if (sourceStage === undefined) {
      throw new Error(`Reusable case is missing stage ${stageId}.`);
    }

    const isModelStage = /:(actor|judge)$/u.test(stageId) && sourceStage.status !== 'skipped';
    stages[stageId] = {
      ...sourceStage,
      status: isModelStage ? 'reused' : sourceStage.status,
      reuseSourceAttemptId: isModelStage ? sourceAttemptId : null,
      hasUsedOperationalStopResume: false,
      operationalRetries: isModelStage ? [] : sourceStage.operationalRetries,
      operationalStops: isModelStage ? [] : sourceStage.operationalStops,
    } satisfies IQualificationStageCheckpoint;
  }

  const checkpoint = QualificationAttemptCheckpointSchema.parse({
    ...options.checkpoint,
    stages,
  });
  await writeAttemptCheckpoint(options.attemptDirectory, checkpoint);
  return { caseResult, checkpoint };
};
