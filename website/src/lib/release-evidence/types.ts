import type { IQualificationEvidenceTargetProjection } from '../../../../tooling/release-identity/release-evidence-source.mjs';

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
      sourceAttemptId: string;
    });

// qualification provenance includes one authenticated compact projection per source target
export type IQualificationReleaseEvidenceSectionModel =
  | Extract<IReleaseEvidenceSectionModel, { mode: 'fresh' }>
  | (Extract<IReleaseEvidenceSectionModel, { mode: 'pinned' }> & {
      targets: IQualificationEvidenceTargetProjection[];
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
