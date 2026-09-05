import type {
  IFreshReleaseEvidenceEnvelope,
  IPinnedReleaseEvidenceEnvelope,
} from './release-evidence-envelope.mjs';

export interface IFreshReleaseEvidenceSource {
  commit: string;
  envelope: IFreshReleaseEvidenceEnvelope;
  envelopeSha256: string;
  tag: string;
}

export const assertPinnedReleaseEvidenceSource: (
  repositoryRoot: string,
  envelope: IPinnedReleaseEvidenceEnvelope,
) => IFreshReleaseEvidenceSource;
export const assertTargetReleaseTagIdentity: (
  repositoryRoot: string,
  releaseVersion: string,
  releaseTag: string | undefined,
) => void;

export const resolveFreshReleaseEvidenceSource: (
  repositoryRoot: string,
  tag: string,
) => IFreshReleaseEvidenceSource;

export const resolveReleaseTagCommit: (repositoryRoot: string, tag: string) => string;
