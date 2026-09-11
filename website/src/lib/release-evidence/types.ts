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

// public release-evidence provenance shown across evidence pages
export type IReleaseEvidenceModel =
  | {
      mode: 'not-recorded';
      targetVersion: string;
    }
  | {
      mode: 'recorded';
      qualification: IReleaseEvidenceSectionModel;
      semantic: IReleaseEvidenceSectionModel;
      targetVersion: string;
    };
