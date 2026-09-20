import type { IQualificationWebsiteModel } from '../qualification/index.ts';
import type {
  ISemanticAttemptModel,
  ISemanticEvaluationWebsiteModel,
} from '../semantic-evaluation/index.ts';

// selected qualification evidence source shown in technical disclosures
export interface IQualificationReleaseEvidenceTargetModel {
  adapterId: string;
  attemptId: string;
  completedAt?: string;
  createdAt?: string;
  implementationId: string;
  packages?: Array<{ name: string; version: string }>;
  sourceAttemptUrl: string;
}

// public provenance for one independently selected evidence section
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

export type IQualificationReleaseEvidenceSectionModel = IReleaseEvidenceSectionModel & {
  targets: IQualificationReleaseEvidenceTargetModel[];
};

// selected public evidence provenance shown across evidence pages
export type IReleaseEvidenceModel =
  | { mode: 'not-recorded'; targetVersion: string }
  | {
      mode: 'recorded';
      qualification: IQualificationReleaseEvidenceSectionModel;
      semantic: ISemanticReleaseEvidenceSectionModel;
      targetVersion: string;
    };

// complete selected models loaded from prepared evidence bundles
export interface IReleaseEvidenceWebsiteState {
  qualification: IQualificationWebsiteModel;
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

export type IQualificationReleaseEvidenceSummary = {
  attemptCount: number;
  kind: 'recorded' | 'not-recorded';
  status: IQualificationWebsiteModel['profiles'][number]['currentStatus'];
};
