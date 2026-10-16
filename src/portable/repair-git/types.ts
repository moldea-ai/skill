// the helper exposes only evidence collection and review of task-owned paths
export type IRepairGitMode = 'checkpoint' | 'continue' | 'review' | 'verify';

export type IRepairGitOptions = {
  repositoryRoot: string;
  mode: IRepairGitMode;
  checkpoint?: string;
  paths?: string[];
};

export type IRepairGitEvidence =
  | {
      kind: 'moldea-repair-git';
      mode: IRepairGitMode;
      status: 'available';
      commit: string;
      uncommittedPaths: string[];
      changedPaths: string[];
      manifestDiff: string;
      uncommittedManifestDiff: string;
      writtenDiff: string;
    }
  | {
      kind: 'moldea-repair-git';
      mode: IRepairGitMode;
      status: 'unavailable';
      reasonCode:
        'arguments' | 'attribute-safety' | 'git-read' | 'commit-unavailable' | 'output-limit';
      reason: string;
    };
