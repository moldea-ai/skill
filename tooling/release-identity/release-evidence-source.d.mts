import type {
  IPinnedReleaseEvidenceSource,
  IQualificationReleaseEvidence,
  IReleaseEvidenceSection,
  ISemanticReleaseEvidence,
} from './release-evidence-envelope.mjs';

export type IPinnedReleaseEvidenceSection =
  | (IReleaseEvidenceSection<IQualificationReleaseEvidence> & {
      mode: 'pinned';
    })
  | (IReleaseEvidenceSection<ISemanticReleaseEvidence> & { mode: 'pinned' });
export type IPinnedQualificationReleaseEvidenceSection =
  IReleaseEvidenceSection<IQualificationReleaseEvidence> & { mode: 'pinned' };
export type IPinnedSemanticReleaseEvidenceSection =
  IReleaseEvidenceSection<ISemanticReleaseEvidence> & { mode: 'pinned' };

export type IResolvedReleaseEvidenceSource =
  | IPinnedReleaseEvidenceSource<IQualificationReleaseEvidence>
  | IPinnedReleaseEvidenceSource<ISemanticReleaseEvidence>;

// bounded public projection derived while authenticating one qualification source
export interface IQualificationEvidenceTargetProjection {
  adapterId: string;
  attemptId: string;
  completedAt: string;
  createdAt: string;
  implementationId: string;
  packages: Array<{
    name: string;
    version: string;
  }>;
}

// bounded public projection derived while authenticating one semantic source
export interface ISemanticEvidenceAttemptProjection {
  artifactDigest: string;
  attemptId: string;
  createdAt: string;
  failedCaseCount: number;
  passedCaseCount: number;
  pendingCaseCount: number;
  recoveredCaseCount: number;
  status: 'passed';
  totalCaseCount: number;
  updatedAt: string;
}

// authenticated bounded source retained for one static website generation
export interface IPinnedReleaseEvidenceSourceSnapshot<Projection> {
  commit: string;
  fileCount: number;
  files: ReadonlyMap<string, Buffer>;
  projection: Projection;
  totalByteCount: number;
}

export const assertPinnedReleaseEvidenceSection: {
  (
    repositoryRoot: string,
    section: IPinnedQualificationReleaseEvidenceSection,
    kind: 'qualification',
  ): IQualificationEvidenceTargetProjection[];
  (
    repositoryRoot: string,
    section: IPinnedSemanticReleaseEvidenceSection,
    kind: 'semantic',
  ): ISemanticEvidenceAttemptProjection;
};

export const loadPinnedReleaseEvidenceSection: {
  (
    repositoryRoot: string,
    section: IPinnedQualificationReleaseEvidenceSection,
    kind: 'qualification',
  ): IPinnedReleaseEvidenceSourceSnapshot<IQualificationEvidenceTargetProjection[]>;
  (
    repositoryRoot: string,
    section: IPinnedSemanticReleaseEvidenceSection,
    kind: 'semantic',
  ): IPinnedReleaseEvidenceSourceSnapshot<ISemanticEvidenceAttemptProjection>;
};
export const assertTargetReleaseTagIdentity: (
  repositoryRoot: string,
  releaseVersion: string,
  releaseTag: string | undefined,
) => void;

export const resolveReleaseEvidenceSectionSource: (
  repositoryRoot: string,
  options: {
    commit?: string | null;
    kind: 'qualification' | 'semantic';
    tag?: string | null;
  },
) => IResolvedReleaseEvidenceSource;

export const resolveReleaseTagCommit: (repositoryRoot: string, tag: string) => string;
