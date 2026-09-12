import type {
  IQualificationEvidenceTargetProjection,
  ISemanticEvidenceAttemptProjection,
} from '../../../../tooling/release-identity/release-evidence-source.mjs';

import type {
  IQualificationProfileModel,
  IQualificationWebsiteModel,
} from '../qualification/index.ts';
import type {
  ISemanticAttemptModel,
  ISemanticEvaluationWebsiteModel,
} from '../semantic-evaluation/index.ts';

// authenticated qualification source attempt with its immutable public location
export interface IQualificationReleaseEvidenceTargetModel extends IQualificationEvidenceTargetProjection {
  sourceAttemptUrl: string;
}

// public provenance for one independently selected evidence section
export type IReleaseEvidenceSectionModel =
  | {
      mode: 'fresh';
      sourceUrl: string;
    }
  | {
      mode: 'pinned';
      reason: string;
      sourceCommit: string;
      sourceLabel: string;
      sourceUrl: string;
    };

// semantic provenance also identifies its independently verified source attempt
export type ISemanticReleaseEvidenceSectionModel =
  | Extract<IReleaseEvidenceSectionModel, { mode: 'fresh' }>
  | (Extract<IReleaseEvidenceSectionModel, { mode: 'pinned' }> & {
      attempt: ISemanticEvidenceAttemptProjection;
      sourceAttemptUrl: string;
    });

// qualification provenance includes one authenticated compact projection per source target
export type IQualificationReleaseEvidenceSectionModel =
  | Extract<IReleaseEvidenceSectionModel, { mode: 'fresh' }>
  | (Extract<IReleaseEvidenceSectionModel, { mode: 'pinned' }> & {
      targets: IQualificationReleaseEvidenceTargetModel[];
    });

// public release-evidence provenance shown across evidence pages
export type IReleaseEvidenceModel =
  | {
      mode: 'not-recorded';
      targetVersion: string;
    }
  | {
      mode: 'recorded';
      qualification: IQualificationReleaseEvidenceSectionModel;
      semantic: ISemanticReleaseEvidenceSectionModel;
      targetVersion: string;
    };

// complete build-time state with hydrated pinned models kept outside the public provenance model
export interface IReleaseEvidenceWebsiteState {
  pinnedQualification: IQualificationWebsiteModel | null;
  pinnedSemantic: ISemanticEvaluationWebsiteModel | null;
  releaseEvidence: IReleaseEvidenceModel;
}

// release-facing semantic result selected without changing current-contract state
export type ISemanticReleaseEvidenceSummary =
  | {
      kind: 'current';
      result: ISemanticAttemptModel['result'];
      sourceUrl: string;
    }
  | {
      kind: 'pinned';
      result: ISemanticEvidenceAttemptProjection;
      sourceUrl: string;
    }
  | {
      kind: 'not-recorded';
      result: null;
      sourceUrl: null;
    };

// release-facing qualification result selected without changing current-contract state
export type IQualificationReleaseEvidenceSummary =
  | {
      attemptCount: number;
      kind: 'current';
      status: IQualificationProfileModel['currentStatus'];
    }
  | {
      attemptCount: 1;
      kind: 'pinned';
      status: 'passed';
    }
  | {
      attemptCount: 0;
      kind: 'not-recorded';
      status: 'not-recorded';
    };
