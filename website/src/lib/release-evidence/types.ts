// public release-evidence provenance shown across evidence pages
export type IReleaseEvidenceModel =
  | {
      mode: 'not-recorded';
      targetVersion: string;
    }
  | {
      mode: 'fresh';
      sourceUrl: string;
      targetVersion: string;
    }
  | {
      mode: 'pinned';
      reason: string;
      sourceCommit: string;
      sourceTag: string;
      sourceUrl: string;
      targetVersion: string;
    };
