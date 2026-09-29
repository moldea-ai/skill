import { createHash } from 'node:crypto';

import { z } from 'zod';

import { readCompletedEvidenceRun, type IEvidenceBundle } from '../../evidence/index.ts';
import { getEvaluationConfirmationResolution } from '../../execution/confirmation/index.ts';
import type { ISemanticCase } from '../cases/index.ts';
import {
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingSemanticResultDimensions,
  isSemanticConfirmationEligible,
} from '../execution/index.ts';
import {
  parseSemanticWebsiteModel,
  type ISemanticAttemptRecord,
  type ISemanticEvaluationCaseModel,
} from '../public-evidence/index.ts';
import { parseSemanticRecordedCases } from './checkpoint.ts';
import type { ISemanticRecordedCase, ISemanticRecordedTrial } from './types.ts';

const CaseReviewSchema = z.strictObject({
  caseId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  rationale: z.string().trim().min(16),
});

/** Explicit maintainer decisions for carrying recorded actors into the current suite. */
export const SemanticCompositionReviewSchema = z.strictObject({
  acceptedCriteria: z.array(CaseReviewSchema).default([]),
  caseSources: z
    .array(
      z.strictObject({
        attemptId: z.string().regex(/^sem-[a-z0-9-]+$/u),
        caseId: CaseReviewSchema.shape.caseId,
      }),
    )
    .default([]),
  formatVersion: z.literal(1),
  inputReview: z.string().trim().min(16).nullable().default(null),
  reassessments: z.array(CaseReviewSchema).default([]),
});

export type ISemanticCompositionReview = z.infer<typeof SemanticCompositionReviewSchema>;

export interface ISemanticSourceRun {
  attempt: ISemanticAttemptRecord;
  bundle: IEvidenceBundle;
  caseModels: Map<string, ISemanticEvaluationCaseModel>;
  cases: Map<string, ISemanticRecordedCase>;
  evidenceSha256: string;
}

const createJsonSha256 = (input: unknown): string =>
  createHash('sha256')
    .update(`${JSON.stringify(input)}\n`)
    .digest('hex');

const readArtifact = (bundle: IEvidenceBundle, artifactPath: string): unknown => {
  const file = bundle.artifacts.files.find(({ path }) => path === artifactPath);
  const blob = bundle.artifacts.blobs.find(({ sha256 }) => sha256 === file?.sha256);
  if (blob === undefined) throw new Error(`Semantic source lacks artifact ${artifactPath}.`);
  return JSON.parse(Buffer.from(blob.contentBase64, 'base64').toString('utf8')) as unknown;
};

/** Loads one exact completed semantic run with its private recorded trial evidence. */
export const loadSemanticSourceRun = async (
  repositoryRoot: string,
  attemptId: string,
): Promise<ISemanticSourceRun> => {
  const bundle = await readCompletedEvidenceRun(repositoryRoot, 'semantic', attemptId);
  if (bundle.classification !== 'official') {
    throw new Error(`Semantic source ${attemptId} is not an official run.`);
  }
  const websiteModel = parseSemanticWebsiteModel(
    (bundle.payload as { websiteModel?: unknown }).websiteModel,
  );
  const latest = websiteModel.latest;
  if (latest === null || latest.result.attemptId !== attemptId) {
    throw new Error(`Semantic source ${attemptId} has no matching attempt.`);
  }
  const evidencePath = latest.result.evidence.path;
  const evidenceRecord = z
    .strictObject({ cases: z.unknown(), schemaVersion: z.literal(11) })
    .parse(readArtifact(bundle, evidencePath));
  const evidenceSha256 = createJsonSha256(evidenceRecord);
  if (latest.result.evidence.sha256 !== evidenceSha256) {
    throw new Error(`Semantic source ${attemptId} has mismatched recorded evidence.`);
  }
  const cases = parseSemanticRecordedCases(evidenceRecord.cases, {
    cliVersion: latest.result.cli.version,
    jsonSchemaVersion: latest.result.cli.jsonSchemaVersion,
  });
  if (
    cases.length !== latest.cases.length ||
    cases.some((recordedCase, index) => recordedCase.id !== latest.cases[index]?.id)
  ) {
    throw new Error(`Semantic source ${attemptId} has mismatched public cases.`);
  }
  return {
    attempt: latest.result,
    bundle,
    caseModels: new Map(latest.cases.map((caseModel) => [caseModel.id, caseModel])),
    cases: new Map(cases.map((recordedCase) => [recordedCase.id, recordedCase])),
    evidenceSha256,
  };
};

const requireUniqueReviews = (reviews: ISemanticCompositionReview): void => {
  const acceptedIds = reviews.acceptedCriteria.map(({ caseId }) => caseId);
  const reassessedIds = reviews.reassessments.map(({ caseId }) => caseId);
  const selectedIds = reviews.caseSources.map(({ caseId }) => caseId);
  if (
    new Set(acceptedIds).size !== acceptedIds.length ||
    new Set(reassessedIds).size !== reassessedIds.length ||
    new Set(selectedIds).size !== selectedIds.length ||
    reassessedIds.some((caseId) => acceptedIds.includes(caseId))
  ) {
    throw new Error('Semantic composition reviews must name each case once.');
  }
};

const carryTrial = (options: {
  caseDefinition: ISemanticCase;
  preserveVerdict: boolean;
  recordedTrial: ISemanticRecordedTrial;
  reviewRationale: string | null;
  source: ISemanticSourceRun;
}): ISemanticRecordedTrial => {
  const { caseDefinition, recordedTrial, reviewRationale, source } = options;
  const oldTrial = recordedTrial.trial;
  const dimensions = options.preserveVerdict
    ? oldTrial.dimensions
    : createSemanticResultDimensions({
        actorCommandPolicy: oldTrial.actorCommandPolicyEvidence,
        actorResourceEvidence: oldTrial.actorResourceEvidence,
        caseDefinition,
        isMountIntegrityPassing: oldTrial.dimensions.mountIntegrity,
        isRepositoryControlPassing: oldTrial.dimensions.repositoryControl,
        isSemanticPassing: reviewRationale !== null || oldTrial.dimensions.semantic,
        judgeCommandPolicy: oldTrial.judgeCommandPolicyEvidence,
      });
  const hasChangedVerdict =
    reviewRationale !== null ||
    dimensions.resource !== oldTrial.dimensions.resource ||
    dimensions.semantic !== oldTrial.dimensions.semantic;
  const reassessment =
    reviewRationale ??
    (hasChangedVerdict
      ? 'Resource containment was recomputed under the current case budget; the recorded semantic judgment was retained.'
      : null);
  const previousSource = oldTrial.carriedFrom;
  const recordedVerdict =
    previousSource?.recordedVerdict ??
    (hasChangedVerdict ? { passed: oldTrial.passed, rationale: oldTrial.rationale } : undefined);
  return {
    ...recordedTrial,
    trial: {
      ...oldTrial,
      carriedFrom: {
        attemptId: previousSource?.attemptId ?? source.attempt.attemptId,
        artifactDigest: previousSource?.artifactDigest ?? source.attempt.artifactDigest,
        cliVersion: previousSource?.cliVersion ?? source.attempt.cli.version,
        evidenceSha256: previousSource?.evidenceSha256 ?? source.evidenceSha256,
        reassessment: reassessment ?? previousSource?.reassessment ?? null,
        ...(recordedVerdict === undefined ? {} : { recordedVerdict }),
        version: previousSource?.version ?? source.bundle.run.version,
      },
      confirmationEligible: options.preserveVerdict
        ? oldTrial.confirmationEligible
        : isSemanticConfirmationEligible(dimensions),
      dimensions,
      executionOrigin: 'carried',
      failureClassifications: options.preserveVerdict
        ? oldTrial.failureClassifications
        : getSemanticFailureClassifications(dimensions),
      passed: options.preserveVerdict
        ? oldTrial.passed
        : hasPassingSemanticResultDimensions(dimensions),
      rationale:
        reassessment === null ? oldTrial.rationale : `Maintainer reassessment: ${reassessment}`,
    },
  };
};

const carryCase = (options: {
  caseDefinition: ISemanticCase;
  preserveVerdict: boolean;
  recordedCase: ISemanticRecordedCase;
  reviewRationale: string | null;
  source: ISemanticSourceRun;
}): ISemanticRecordedCase => {
  const trials = options.recordedCase.trials.map((recordedTrial, index) =>
    carryTrial({
      caseDefinition: options.caseDefinition,
      preserveVerdict: options.preserveVerdict,
      recordedTrial,
      reviewRationale: index === 0 ? options.reviewRationale : null,
      source: options.source,
    }),
  );
  if (options.preserveVerdict) return { ...options.recordedCase, trials };
  const initialTrial = trials[0]?.trial;
  if (initialTrial === undefined) throw new Error('Semantic source case has no initial trial.');
  if (initialTrial.passed) {
    return {
      confirmationStatus: 'not-required',
      id: options.caseDefinition.id,
      status: 'passed',
      trials,
    };
  }
  if (!initialTrial.confirmationEligible) {
    return {
      confirmationStatus: 'not-applicable',
      id: options.caseDefinition.id,
      status: 'failed',
      trials,
    };
  }
  const resolution = getEvaluationConfirmationResolution(
    trials.slice(1).map(({ trial }) => trial.passed),
  );
  return {
    confirmationStatus: resolution === 'recovered' ? 'passed' : 'rejected',
    id: options.caseDefinition.id,
    status: resolution === 'recovered' ? 'recovered' : 'failed',
    trials,
  };
};

/** Selects recorded cases and optional reviewed reassessments without model work. */
export const composeSemanticRecordedCases = (options: {
  definitions: readonly ISemanticCase[];
  review: ISemanticCompositionReview;
  sources: readonly ISemanticSourceRun[];
}): {
  caseModels: Map<string, ISemanticEvaluationCaseModel>;
  cases: ISemanticRecordedCase[];
  unresolvedCaseIds: string[];
} => {
  const { definitions, review, sources } = options;
  if (
    sources.length === 0 ||
    new Set(sources.map(({ attempt }) => attempt.attemptId)).size !== sources.length
  ) {
    throw new Error('Semantic composition requires distinct source attempts.');
  }
  requireUniqueReviews(review);
  const acceptedCriteria = new Map(
    review.acceptedCriteria.map(({ caseId, rationale }) => [caseId, rationale]),
  );
  const reassessments = new Map(
    review.reassessments.map(({ caseId, rationale }) => [caseId, rationale]),
  );
  const selectedSources = new Map(
    review.caseSources.map(({ caseId, attemptId }) => [caseId, attemptId]),
  );
  const currentIds = new Set(definitions.map(({ id }) => id));
  for (const caseId of [
    ...acceptedCriteria.keys(),
    ...reassessments.keys(),
    ...selectedSources.keys(),
  ]) {
    if (!currentIds.has(caseId)) {
      throw new Error(`Semantic review names an unsupported case ${caseId}.`);
    }
  }
  const sourceIds = new Set(sources.map(({ attempt }) => attempt.attemptId));
  for (const attemptId of selectedSources.values()) {
    if (!sourceIds.has(attemptId)) {
      throw new Error(`Semantic case selection names an unavailable source ${attemptId}.`);
    }
  }
  const cases: ISemanticRecordedCase[] = [];
  const caseModels = new Map<string, ISemanticEvaluationCaseModel>();
  const unresolvedCaseIds: string[] = [];
  for (const definition of definitions) {
    const selectedAttemptId = selectedSources.get(definition.id);
    const source = sources.find(
      ({ attempt, cases: sourceCases }) =>
        (selectedAttemptId === undefined || attempt.attemptId === selectedAttemptId) &&
        sourceCases.has(definition.id),
    );
    const sourceCase = source?.cases.get(definition.id);
    const sourceModel = source?.caseModels.get(definition.id);
    if (source === undefined || sourceCase === undefined || sourceModel === undefined) {
      unresolvedCaseIds.push(definition.id);
      continue;
    }
    const hasChangedRequest =
      sourceModel.developerDirection !== definition.input.developerDirection;
    const hasChangedCriteria =
      JSON.stringify(sourceModel.expectedCriteria) !== JSON.stringify(definition.expected) ||
      JSON.stringify(sourceModel.forbiddenCriteria) !== JSON.stringify(definition.forbidden);
    if (
      hasChangedRequest &&
      (acceptedCriteria.has(definition.id) || reassessments.has(definition.id))
    ) {
      throw new Error(`Semantic ${definition.id} cannot reassess a different recorded request.`);
    }
    if (!hasChangedCriteria && acceptedCriteria.has(definition.id)) {
      throw new Error(`Semantic ${definition.id} has no changed criteria to accept.`);
    }
    const carried = carryCase({
      caseDefinition: definition,
      preserveVerdict:
        hasChangedRequest ||
        (hasChangedCriteria &&
          !acceptedCriteria.has(definition.id) &&
          !reassessments.has(definition.id)),
      recordedCase: sourceCase,
      reviewRationale: reassessments.get(definition.id) ?? null,
      source,
    });
    cases.push(carried);
    caseModels.set(
      definition.id,
      hasChangedCriteria &&
        (acceptedCriteria.has(definition.id) || reassessments.has(definition.id))
        ? {
            ...sourceModel,
            expectedCriteria: definition.expected,
            forbiddenCriteria: definition.forbidden,
          }
        : sourceModel,
    );
  }
  for (const caseId of [...acceptedCriteria.keys(), ...reassessments.keys()]) {
    if (!cases.some((recordedCase) => recordedCase.id === caseId)) {
      throw new Error(`Semantic review decision for ${caseId} was not applied.`);
    }
  }
  return { caseModels, cases, unresolvedCaseIds };
};
