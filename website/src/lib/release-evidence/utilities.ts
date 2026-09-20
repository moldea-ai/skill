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
  _currentAssurance: ISemanticAttemptModel | null,
): ISemanticReleaseEvidenceSummary => {
  if (releaseEvidence.mode !== 'recorded') {
    return { kind: 'not-recorded', result: null, sourceUrl: null };
  }
  return {
    kind: 'recorded',
    result: releaseEvidence.semantic.attempt,
    sourceUrl: releaseEvidence.semantic.sourceAttemptUrl,
  };
};

/** Selects one profile's release-facing qualification result without changing current state. */
export const getQualificationReleaseEvidenceSummary = (
  profile: IQualificationProfileModel,
): IQualificationReleaseEvidenceSummary => {
  if (profile.currentLatest !== null) {
    return {
      attemptCount: profile.attempts.length,
      kind: 'recorded',
      status: profile.currentStatus,
    };
  }
  return { attemptCount: 0, kind: 'not-recorded', status: 'not-recorded' };
};
