export interface IReleaseEvidenceTarget {
  dependencyClosureSha256: string;
  portableSkillSha256: string;
  version: string;
}

export interface IQualificationReleaseEvidence {
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
}

export interface ISemanticReleaseEvidence {
  attemptId: string;
  attemptSha256: string;
  evidenceSha256: string;
  latestSha256: string;
  protocolVersion: number;
  resourceStatus: 'passed';
  resultSha256: string;
}

export interface IPinnedReleaseEvidenceSource<TEvidence> {
  commit: string;
  evidence: TEvidence;
  evidenceSha256: string;
  portableSkillSha256: string;
  tag: string | null;
}

export type IReleaseEvidenceSection<TEvidence> =
  | { evidence: TEvidence; mode: 'fresh' }
  | {
      mode: 'pinned';
      reason: string;
      source: IPinnedReleaseEvidenceSource<TEvidence>;
    };

export interface IReleaseEvidenceEnvelope {
  qualification: IReleaseEvidenceSection<IQualificationReleaseEvidence>;
  schemaVersion: 2;
  semantic: IReleaseEvidenceSection<ISemanticReleaseEvidence>;
  target: IReleaseEvidenceTarget;
}

export const RELEASE_EVIDENCE_SCHEMA_VERSION: 2;
export const MAX_RELEASE_EVIDENCE_BYTES: number;
export const MAX_RELEASE_EVIDENCE_REASON_BYTES: number;
export const createReleaseEvidenceSha256: (input: string | Uint8Array) => string;
export const parseReleaseEvidenceEnvelope: (source: string) => IReleaseEvidenceEnvelope;
export const readReleaseEvidenceEnvelope: (
  repositoryRoot: string,
) => IReleaseEvidenceEnvelope | null;
export const serializeReleaseEvidenceEnvelope: (envelope: IReleaseEvidenceEnvelope) => string;
export const validateReleaseEvidenceReason: (reason: unknown) => string;
