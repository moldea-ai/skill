import type { IQualificationAttemptResult } from '../../qualification/src/contracts/index.ts';
import type { IQualificationAttemptStorage } from '../../qualification/src/storage/index.ts';

// candidate identities and semantic source evidence recorded by the one-time bridge
export interface ICarryForward401Attestation {
  candidate: {
    cliClosureDigest: string;
    portableSkillArtifactDigest: string;
    portableSkillBehaviorDigest: string;
    semanticCompatibilityDigest: string;
  };
  changedPaths: unknown[];
  modelRunsPerformed: false;
  qualification: unknown;
  schemaVersion: 1;
  semantic: {
    artifactDigest: string;
    attemptId: string;
    attemptSha256: string;
    cliClosureDigest: string;
    evidenceSha256: string;
    portableSkillArtifactDigest: string;
    portableSkillBehaviorDigest: string;
    resultSha256: string;
    semanticCompatibilityDigest: string;
    sourceLockSha256: string;
  };
  sourceCommit: string;
  sourceRelease: string;
  targetRelease: string;
}

export const readCarryForward401Attestation: (
  repositoryRoot: string,
) => ICarryForward401Attestation | null;

// local authorization contract consumed by ordinary qualification without Git history
export const hasCarryForward401Qualification: (
  attestation: unknown,
  options: {
    repositoryRoot: string;
    result: IQualificationAttemptResult;
    storage: IQualificationAttemptStorage;
  },
) => boolean;

export const hasLocalCarryForward401Qualification: (options: {
  repositoryRoot: string;
  result: IQualificationAttemptResult;
  storage: IQualificationAttemptStorage;
}) => boolean;
