export interface IFreshReleaseEvidenceTarget {
  dependencyClosureSha256: string;
  portableSkillSha256: string;
  version: string;
}

export interface IPinnedReleaseEvidenceTarget {
  portableSkillSha256: string;
  version: string;
}

export interface IFreshReleaseEvidenceEnvelope {
  mode: 'fresh';
  qualification: {
    protocolVersion: number;
    resourceStatus: 'passed';
    targets: Array<{
      adapterId: string;
      attemptId: string;
      attemptKey: string;
      attemptSha256: string;
      implementationId: string;
      key: string;
      latestSha256: string;
      storageSha256: string;
    }>;
  };
  schemaVersion: 1;
  semantic: {
    attemptId: string;
    attemptSha256: string;
    evidenceSha256: string;
    latestSha256: string;
    protocolVersion: number;
    resourceStatus: 'passed';
    resultSha256: string;
  };
  target: IFreshReleaseEvidenceTarget;
}

export interface IPinnedReleaseEvidenceEnvelope {
  mode: 'pinned';
  reason: string;
  schemaVersion: 1;
  source: {
    commit: string;
    evidenceSha256: string;
    qualificationSha256: string;
    semanticSha256: string;
    tag: string;
  };
  target: IPinnedReleaseEvidenceTarget;
}

export type IReleaseEvidenceEnvelope =
  IFreshReleaseEvidenceEnvelope | IPinnedReleaseEvidenceEnvelope;

export const RELEASE_EVIDENCE_SCHEMA_VERSION: 1;
export const MAX_RELEASE_EVIDENCE_BYTES: number;
export const MAX_RELEASE_EVIDENCE_REASON_BYTES: number;
export const createReleaseEvidenceSha256: (input: string | Uint8Array) => string;
export const parseReleaseEvidenceEnvelope: (source: string) => IReleaseEvidenceEnvelope;
export const readReleaseEvidenceEnvelope: (
  repositoryRoot: string,
) => IReleaseEvidenceEnvelope | null;
export const serializeReleaseEvidenceEnvelope: (envelope: IReleaseEvidenceEnvelope) => string;
export const validateReleaseEvidenceReason: (reason: unknown) => string;
