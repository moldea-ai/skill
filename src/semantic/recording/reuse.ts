import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { hashValue } from 'jg-crypto';
import { z } from 'zod';

import { readCompletedEvidenceRun, type IEvidenceBundle } from '../../evidence/index.ts';
import { getEvaluationConfirmationResolution } from '../../execution/confirmation/index.ts';
import { SEMANTIC_EVALUATION_PROTOCOL_VERSION } from '../../release/index.ts';
import { parseSemanticRecordedCases } from './checkpoint.ts';
import { SEMANTIC_EVIDENCE_SCHEMA_VERSION } from './constants.ts';
import type { ISemanticReusableTrial, ISemanticActiveTrialCheckpoint } from './types.ts';

const MAXIMUM_REUSE_RUN_COUNT = 64;
const EvidenceRecordSchema = z.strictObject({
  cases: z.unknown(),
  schemaVersion: z.literal(SEMANTIC_EVIDENCE_SCHEMA_VERSION),
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
          evidence: z.looseObject({
            evaluationProtocolVersion: z.number().int().positive(),
            sha256: z.string().regex(/^[a-f0-9]{64}$/u),
          }),
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

/** Reads complete terminal case trials, preserving recovered quorums and failed-case stops. */
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
    if (bundle.classification !== 'official') continue;
    const payload = LocalSemanticPayloadSchema.parse(bundle.payload);
    const sourceAttempt = payload.websiteModel.attempts.find(
      ({ result }) => result.attemptId === attemptId,
    );
    if (sourceAttempt === undefined)
      throw new Error(`Semantic local run ${attemptId} lacks its matching attempt.`);
    if (
      sourceAttempt.result.evidence.evaluationProtocolVersion !==
      SEMANTIC_EVALUATION_PROTOCOL_VERSION
    )
      continue;
    const artifactPath = `.evidence/semantic/results/attempts/${attemptId}/evidence.json`;
    const evidenceRecord = EvidenceRecordSchema.parse(
      JSON.parse(getArtifactContent(bundle, artifactPath).toString('utf8')) as unknown,
    );
    const sourceEvidenceSha256 = hashValue(`${JSON.stringify(evidenceRecord)}\n`);
    if (sourceAttempt?.result.evidence.sha256 !== sourceEvidenceSha256) {
      throw new Error(`Semantic local run ${attemptId} has mismatched private evidence identity.`);
    }
    const recordedCases = parseSemanticRecordedCases(evidenceRecord.cases, {
      cliVersion: payload.websiteModel.cli.version,
      jsonSchemaVersion: payload.websiteModel.cli.jsonSchemaVersion,
    });

    for (const recordedCase of recordedCases) {
      if (recordedCase.status === 'pending') continue;
      const initial = recordedCase.trials[0]?.trial;
      const confirmations = recordedCase.trials.slice(1);
      if (
        initial === undefined ||
        initial.confirmationIndex !== null ||
        (recordedCase.status === 'passed' && !initial.passed) ||
        (recordedCase.status === 'recovered' &&
          (initial.passed ||
            !initial.confirmationEligible ||
            confirmations.some(({ trial }, index) => trial.confirmationIndex !== index + 1) ||
            getEvaluationConfirmationResolution(confirmations.map(({ trial }) => trial.passed)) !==
              'recovered'))
      )
        throw new Error(
          `Semantic reusable case ${attemptId}/${recordedCase.id} does not contain its resolved trial sequence.`,
        );
      // a reviewed passing initial may retain historical confirmations; reuse only its initial
      for (const recordedTrial of recordedCase.status === 'passed'
        ? recordedCase.trials.slice(0, 1)
        : recordedCase.trials) {
        candidates.push({
          caseId: recordedCase.id,
          sourceCaseStatus: recordedCase.status,
          recordedTrial,
          sourceAttemptId: attemptId,
          sourceEvidenceSha256,
        });
      }
    }
  }

  return candidates;
};

/**
 * Reuses the newest exact resolved case without rerunning its retained initial failure.
 * @throws
 * - An unchanged failed semantic case cannot be rerun; correct its identified test defect or exclude it.
 */
export const selectSemanticReusableTrial = (options: {
  actorIdentitySha256: string;
  activeTrial: ISemanticActiveTrialCheckpoint | null;
  candidates: readonly ISemanticReusableTrial[];
  caseId: string;
  confirmationIndex: 1 | 2 | 3 | null;
  judgeIdentitySha256: (candidate: ISemanticReusableTrial) => string;
}): ISemanticReusableTrial | null => {
  const candidate = options.candidates.find(
    (entry) =>
      entry.caseId === options.caseId &&
      entry.recordedTrial.trial.confirmationIndex === options.confirmationIndex &&
      entry.recordedTrial.stageIdentities.actorSha256 === options.actorIdentitySha256 &&
      entry.recordedTrial.stageIdentities.judgeSha256 === options.judgeIdentitySha256(entry),
  );
  if (candidate?.sourceCaseStatus === 'failed') {
    throw new Error(
      'An unchanged failed semantic case cannot be rerun; correct its identified test defect or exclude it.',
    );
  }
  return options.activeTrial === null ? (candidate ?? null) : null;
};
