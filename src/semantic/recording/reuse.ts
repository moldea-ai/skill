import { createHash } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { readCompletedEvidenceRun, type IEvidenceBundle } from '../../evidence/index.ts';
import { parseSemanticRecordedCases } from './checkpoint.ts';
import type { ISemanticReusableTrial } from './types.ts';

const MAXIMUM_REUSE_RUN_COUNT = 64;
const EvidenceRecordSchema = z.strictObject({
  cases: z.unknown(),
  schemaVersion: z.literal(11),
});
const LocalSemanticPayloadSchema = z.looseObject({
  websiteModel: z.looseObject({
    cli: z.looseObject({
      jsonSchemaVersion: z.number().int().positive(),
      version: z.string().trim().min(1),
    }),
    attempts: z.array(
      z.looseObject({
        result: z.looseObject({
          attemptId: z.string().min(1),
          evidence: z.looseObject({ sha256: z.string().regex(/^[a-f0-9]{64}$/u) }),
        }),
      }),
    ),
  }),
});

const getArtifactContent = (bundle: IEvidenceBundle, artifactPath: string): Buffer => {
  const file = bundle.artifacts.files.find(
    ({ path: candidatePath }) => candidatePath === artifactPath,
  );
  if (file === undefined) {
    throw new Error(`Semantic local run ${bundle.run.attemptId} has no private evidence artifact.`);
  }
  const blob = bundle.artifacts.blobs.find(({ sha256 }) => sha256 === file.sha256);
  if (blob === undefined) {
    throw new Error(`Semantic local run ${bundle.run.attemptId} has incomplete private evidence.`);
  }
  return Buffer.from(blob.contentBase64, 'base64');
};

/** Reads a bounded newest-first set of exact passing trial candidates from local run storage. */
export const loadSemanticReusableTrials = async (
  repositoryRoot: string,
): Promise<ISemanticReusableTrial[]> => {
  const runsRoot = path.join(repositoryRoot, '.evidence', 'runs', 'semantic');
  let fileNames: string[];
  try {
    fileNames = await readdir(runsRoot);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }

  const attemptIds = fileNames
    .filter((fileName) => fileName.endsWith('.json') && fileName !== 'latest.json')
    .map((fileName) => fileName.slice(0, -5))
    .sort((left, right) => right.localeCompare(left, 'en'))
    .slice(0, MAXIMUM_REUSE_RUN_COUNT);
  const candidates: ISemanticReusableTrial[] = [];

  for (const attemptId of attemptIds) {
    const bundle = await readCompletedEvidenceRun(repositoryRoot, 'semantic', attemptId);
    const artifactPath = `.evidence/semantic/results/attempts/${attemptId}/evidence.json`;
    const evidenceRecord = EvidenceRecordSchema.parse(
      JSON.parse(getArtifactContent(bundle, artifactPath).toString('utf8')) as unknown,
    );
    const sourceEvidenceSha256 = createHash('sha256')
      .update(`${JSON.stringify(evidenceRecord)}\n`)
      .digest('hex');
    const payload = LocalSemanticPayloadSchema.parse(bundle.payload);
    const sourceAttempt = payload.websiteModel.attempts.find(
      ({ result }) => result.attemptId === attemptId,
    );
    if (sourceAttempt?.result.evidence.sha256 !== sourceEvidenceSha256) {
      throw new Error(`Semantic local run ${attemptId} has mismatched private evidence identity.`);
    }
    const recordedCases = parseSemanticRecordedCases(evidenceRecord.cases, {
      cliVersion: payload.websiteModel.cli.version,
      jsonSchemaVersion: payload.websiteModel.cli.jsonSchemaVersion,
    });

    for (const recordedCase of recordedCases) {
      for (const recordedTrial of recordedCase.trials) {
        if (recordedTrial.trial.passed) {
          candidates.push({
            caseId: recordedCase.id,
            recordedTrial,
            sourceAttemptId: attemptId,
            sourceEvidenceSha256,
          });
        }
      }
    }
  }

  return candidates;
};

/** Selects the newest exact passing actor/judge pair for one semantic trial. */
export const selectSemanticReusableTrial = (options: {
  actorIdentitySha256: string;
  candidates: readonly ISemanticReusableTrial[];
  caseId: string;
  confirmationIndex: 1 | 2 | 3 | null;
  judgeIdentitySha256: (candidate: ISemanticReusableTrial) => string;
}): ISemanticReusableTrial | null =>
  options.candidates.find(
    (candidate) =>
      candidate.caseId === options.caseId &&
      candidate.recordedTrial.trial.confirmationIndex === options.confirmationIndex &&
      candidate.recordedTrial.stageIdentities.actorSha256 === options.actorIdentitySha256 &&
      candidate.recordedTrial.stageIdentities.judgeSha256 ===
        options.judgeIdentitySha256(candidate),
  ) ?? null;
