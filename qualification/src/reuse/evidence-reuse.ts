import { access, readFile, readdir, rm } from 'node:fs/promises';
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
import { haveQualificationExecutionInputsChanged } from '../execution/validations.ts';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../../../src/filesystem/index.ts';
import { validateQualificationAttemptEvidence } from '../result/index.ts';
import {
  createQualificationAttemptKey,
  resolveQualificationArtifactPath,
  resolveQualificationResultTargetDirectory,
  verifyQualificationAttemptStorage,
} from '../storage/index.ts';
import type { IReusableQualificationCase } from './types.ts';

const pathExists = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

const createPublicPackages = (candidate: ICandidateClosure) =>
  [...candidate.packages, ...(candidate.runtimePackages ?? []), candidate.typeScriptPackage].map(
    createPublicCandidatePackage,
  );

const hasExactCurrentSourceIdentity = (options: {
  baselineAttemptId: string | null;
  candidate: ICandidateClosure;
  checkpoint: IQualificationAttemptCheckpoint;
  executionEnvironment: IQualificationExecutionEnvironment;
  result: IQualificationAttemptResult;
}): boolean => {
  const { checkpoint, result } = options;
  return (
    result.mode === 'official' &&
    result.status === 'failed' &&
    result.selection.adapterId === checkpoint.selection.adapterId &&
    result.selection.implementationId === checkpoint.selection.implementationId &&
    result.provenance.candidateFingerprint === options.candidate.fingerprint &&
    result.provenance.compatibilitySnapshot.sha256 === checkpoint.compatibilitySnapshot.sha256 &&
    result.provenance.compatibilitySnapshot.sourceUrl ===
      checkpoint.compatibilitySnapshot.sourceUrl &&
    result.provenance.skillRepositoryFingerprint === checkpoint.skillDigest &&
    result.provenance.targetDigest === checkpoint.targetDigest &&
    result.provenance.qualificationDigest === checkpoint.qualificationDigest &&
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
    !haveQualificationExecutionInputsChanged(result.provenance, options.executionEnvironment)
  );
};

/** Finds exact local passing groups without admitting failed or partial case history. */
export const loadReusableQualificationCases = async (options: {
  baselineAttemptId: string | null;
  candidate: ICandidateClosure;
  caseIds: readonly string[];
  checkpoint: IQualificationAttemptCheckpoint;
  executionEnvironment: IQualificationExecutionEnvironment;
  resultsRoot: string;
}): Promise<Map<string, IReusableQualificationCase>> => {
  const targetRoot = await resolveQualificationResultTargetDirectory(
    options.resultsRoot,
    options.checkpoint.selection,
  );
  const attemptsRoot = path.join(targetRoot, 'attempts');

  const candidates: IReusableQualificationCase[] = [];

  if (await pathExists(path.join(targetRoot, 'latest.json'))) {
    const entries = await readdir(attemptsRoot, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory() || !/^a-[a-f0-9]{32}$/u.test(entry.name)) continue;
      const attemptDirectory = path.join(attemptsRoot, entry.name);

      try {
        const result = await readJsonFile(
          path.join(attemptDirectory, 'attempt.json'),
          QualificationAttemptResultSchema,
        );
        if (
          createQualificationAttemptKey(result.attemptId) !== entry.name ||
          !hasExactCurrentSourceIdentity({
            baselineAttemptId: options.baselineAttemptId,
            candidate: options.candidate,
            checkpoint: options.checkpoint,
            executionEnvironment: options.executionEnvironment,
            result,
          })
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
                trial.actorReuseSourceAttemptId === null &&
                trial.judgeReuseSourceAttemptId === null,
            )
          ) {
            candidates.push({
              caseResult,
              readArtifact: (logicalPath) =>
                readFile(resolveQualificationArtifactPath(attemptDirectory, storage, logicalPath)),
              sourceAttemptId: result.attemptId,
              sourceCommit: result.provenance.qualificationRepositoryCommit,
              sourceCreatedAt: result.createdAt,
              sourceStages: result.stages,
              storage,
            });
          }
        }
      } catch {
        continue;
      }
    }
  }

  candidates.sort(
    (left, right) =>
      right.sourceCreatedAt.localeCompare(left.sourceCreatedAt, 'en') ||
      right.sourceAttemptId.localeCompare(left.sourceAttemptId, 'en'),
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
  const sourceAttemptId = reusableCase.sourceAttemptId;
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

    const destinationPath = path.join(options.publicDirectory, artifact.logicalPath);
    const trialMatch = artifact.logicalPath.match(
      /^cases\/[^/]+\/trials\/(initial|confirmation-[123])\/(actor|judge)-evidence\.json$/u,
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
      const evidence = QualificationModelStageEvidenceSchema.parse(
        JSON.parse(
          (await reusableCase.readArtifact(artifact.logicalPath)).toString('utf8'),
        ) as unknown,
      );
      await writeJsonFileAtomically(destinationPath, {
        ...evidence,
        reuseSourceAttemptId: sourceAttemptId,
      });
    } else {
      await ensureDirectory(path.dirname(destinationPath));
      await writeTextFileAtomically(
        destinationPath,
        (await reusableCase.readArtifact(artifact.logicalPath)).toString('utf8'),
      );
    }
  }

  const sourceStages = new Map(reusableCase.sourceStages.map((stage) => [stage.id, stage]));
  const caseStagePrefix = `case:${reusableCase.caseResult.caseId}:`;
  const stages = { ...options.checkpoint.stages };

  for (const stageId of Object.keys(stages).filter((id) => id.startsWith(caseStagePrefix))) {
    const currentStage = stages[stageId];
    const sourceStage = sourceStages.get(stageId);

    if (currentStage === undefined) {
      throw new Error(`Qualification checkpoint is missing stage ${stageId}.`);
    }

    if (sourceStage === undefined) {
      stages[stageId] = {
        ...currentStage,
        status: 'skipped',
        startedAt: null,
        completedAt: null,
        durationMs: null,
        stageIdentity: null,
        reuseSourceAttemptId: null,
        hasUsedOperationalStopResume: false,
        operationalRetries: [],
        operationalStops: [],
        error: null,
      } satisfies IQualificationStageCheckpoint;
      continue;
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
