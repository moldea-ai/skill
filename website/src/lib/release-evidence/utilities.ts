import type { IQualificationProfileModel } from '../qualification/index.ts';
import type { ISemanticAttemptModel } from '../semantic-evaluation/index.ts';

import type {
  IQualificationReleaseEvidenceSummary,
  IReleaseEvidenceModel,
  ISemanticReleaseEvidenceSummary,
} from './types.ts';

/** Selects the release-facing semantic result without changing current-contract evidence. */
export const getSemanticReleaseEvidenceSummary = (
  releaseEvidence: IReleaseEvidenceModel,
  currentAssurance: ISemanticAttemptModel | null,
): ISemanticReleaseEvidenceSummary => {
  if (
    currentAssurance !== null &&
    currentAssurance.evidenceSource.kind === 'current' &&
    currentAssurance.result.status === 'passed'
  ) {
    return {
      kind: 'current',
      result: currentAssurance.result,
      sourceUrl: currentAssurance.rawEvidenceUrl,
    };
  }
  if (releaseEvidence.mode === 'recorded' && releaseEvidence.semantic.mode === 'pinned') {
    return {
      kind: 'pinned',
      result: releaseEvidence.semantic.attempt,
      sourceUrl: releaseEvidence.semantic.sourceAttemptUrl,
    };
  }
  return { kind: 'not-recorded', result: null, sourceUrl: null };
};

/** Selects one profile's release-facing qualification result without changing current state. */
export const getQualificationReleaseEvidenceSummary = (
  profile: IQualificationProfileModel,
): IQualificationReleaseEvidenceSummary => {
  if (profile.currentLatest !== null && profile.currentLatest.evidenceSource?.kind !== 'pinned') {
    return {
      attemptCount: profile.attempts.length,
      kind: 'current',
      status: profile.currentStatus,
    };
  }
  if (profile.pinnedPriorEvidence !== null || profile.currentLatest !== null) {
    return { attemptCount: 1, kind: 'pinned', status: 'passed' };
  }
  return { attemptCount: 0, kind: 'not-recorded', status: 'not-recorded' };
};
