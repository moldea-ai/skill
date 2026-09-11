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

export type IResolvedReleaseEvidenceSource =
  | IPinnedReleaseEvidenceSource<IQualificationReleaseEvidence>
  | IPinnedReleaseEvidenceSource<ISemanticReleaseEvidence>;

export const assertPinnedReleaseEvidenceSection: (
  repositoryRoot: string,
  section: IPinnedReleaseEvidenceSection,
  kind: 'qualification' | 'semantic',
) => IResolvedReleaseEvidenceSource;
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
