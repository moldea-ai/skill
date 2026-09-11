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

// semantic provenance also identifies the exact attempt rendered as release evidence
export type ISemanticReleaseEvidenceSectionModel =
  | Extract<IReleaseEvidenceSectionModel, { mode: 'fresh' }>
  | (Extract<IReleaseEvidenceSectionModel, { mode: 'pinned' }> & {
      sourceAttemptId: string;
    });

// public release-evidence provenance shown across evidence pages
export type IReleaseEvidenceModel =
  | {
      mode: 'not-recorded';
      targetVersion: string;
    }
  | {
      mode: 'recorded';
      qualification: IReleaseEvidenceSectionModel;
      semantic: ISemanticReleaseEvidenceSectionModel;
      targetVersion: string;
    };
