import { createPublicCandidatePackage } from '../candidate-closure/index.ts';
import {
  QUALIFICATION_CONFIRMATION_POLICY,
  QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
} from '../constants/index.ts';
import {
  QualificationAttemptResultDraftSchema,
  type ICandidateClosure,
  type IQualificationAttemptCheckpoint,
  type IQualificationAttemptResult,
  type IQualificationCaseResult,
} from '../contracts/index.ts';
import type { IQualificationExecutionProvenance } from './types.ts';

const createPublicPackages = (candidate: ICandidateClosure | null) =>
  candidate === null
    ? []
    : [
        ...candidate.packages,
        ...(candidate.runtimePackages ?? []),
        candidate.typeScriptPackage,
      ].map(createPublicCandidatePackage);

const calculateEvidenceGeneratedAt = (
  caseResults: readonly IQualificationCaseResult[],
): string | null => {
  const evidenceTimestamps = caseResults.flatMap((caseResult) =>
    caseResult.trials.flatMap((trial) =>
      [trial.actorEvidenceCreatedAt, trial.judgeEvidenceCreatedAt].filter(
        (timestamp): timestamp is string => timestamp !== null,
      ),
    ),
  );
  return evidenceTimestamps.sort((left, right) => left.localeCompare(right, 'en')).at(0) ?? null;
};

/**
 * Creates a validated local result draft before any official publication checks.
 * @returns The local result shared by dry-run reporting and result recording.
 */
export const createQualificationAttemptResult = (options: {
  caseResults: IQualificationCaseResult[];
  checkpoint: IQualificationAttemptCheckpoint;
  completedAt: string | null;
  provenance: IQualificationExecutionProvenance;
  status: 'errored' | 'failed' | 'incomplete' | 'passed';
  summary: string;
  stageIds: readonly string[];
}): IQualificationAttemptResult =>
  QualificationAttemptResultDraftSchema.parse({
    protocolVersion: QUALIFICATION_EVIDENCE_PROTOCOL_VERSION,
    confirmationPolicy: QUALIFICATION_CONFIRMATION_POLICY,
    attemptId: options.checkpoint.attemptId,
    parentAttemptId: options.checkpoint.parentAttemptId,
    selection: options.checkpoint.selection,
    status: options.status,
    createdAt: options.checkpoint.createdAt,
    completedAt: options.completedAt,
    evidenceGeneratedAt: calculateEvidenceGeneratedAt(options.caseResults),
    summary: options.summary,
    provenance: {
      ...options.provenance,
      packages: createPublicPackages(options.checkpoint.candidate),
    },
    stages: options.stageIds.map((stageId) => options.checkpoint.stages[stageId]),
    cases: options.caseResults,
    artifactDigests: {},
  });
