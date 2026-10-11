import type {
  ISemanticAttemptModel,
  ISemanticEvaluationWebsiteModel,
} from '../semantic-evaluation/index.ts';

// public provenance for the selected evidence section
export interface IReleaseEvidenceSectionModel {
  mode: 'selected';
  recordedAt: string;
  sourceLabel: string;
  sourceUrl: string;
}

export type ISemanticReleaseEvidenceSectionModel = IReleaseEvidenceSectionModel & {
  attempt: Pick<
    ISemanticAttemptModel['result'],
    | 'artifactDigest'
    | 'attemptId'
    | 'createdAt'
    | 'failedCaseCount'
    | 'passedCaseCount'
    | 'pendingCaseCount'
    | 'recoveredCaseCount'
    | 'status'
    | 'totalCaseCount'
    | 'updatedAt'
  >;
  sourceAttemptUrl: string;
};

// selected public evidence provenance shown across evidence pages
export type IReleaseEvidenceModel =
  | { mode: 'not-recorded'; targetVersion: string }
  | {
      mode: 'recorded';
      semantic: ISemanticReleaseEvidenceSectionModel;
      targetVersion: string;
    };

// complete selected models loaded from prepared evidence bundles
export interface IReleaseEvidenceWebsiteState {
  releaseEvidence: IReleaseEvidenceModel;
  semantic: ISemanticEvaluationWebsiteModel;
}

export type ISemanticReleaseEvidenceSummary =
  | {
      kind: 'recorded';
      result: ISemanticReleaseEvidenceSectionModel['attempt'];
      sourceUrl: string;
    }
  | { kind: 'not-recorded'; result: null; sourceUrl: null };
