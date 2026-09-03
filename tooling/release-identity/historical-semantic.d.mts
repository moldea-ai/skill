import type { IQualificationAttemptResult } from '../../qualification/src/contracts/index.ts';
import type { IQualificationAttemptStorage } from '../../qualification/src/storage/index.ts';

import type { ICarryForward401Attestation } from './carry-forward-4-0-1.mjs';
import type { ICompatibilityBridge402Attestation } from './compatibility-bridge-4-0-2.mjs';

export interface IPublishedPackageIdentity {
  name: string;
  registryIntegrity: string;
  registryShasum: string;
  registryTarballUrl: string;
  sha256: string;
  tarballName: string;
  version: string;
}

// immutable qualification fields consumed by the compatibility bridge
export interface ICompatibilityBridge402QualificationEnvelope {
  attestationId: string;
  attemptId: string;
  attemptSha256: string;
  candidateCompatibility: IQualificationAttemptStorage['compatibility'];
  candidateTargetCompatibilityDigest: string;
  cliClosureDigest: string;
  compatibility: IQualificationAttemptStorage['compatibility'];
  environment: {
    allowedEgressHosts: string[];
    codexVersion: string;
    gitVersion: string;
    hostTimeoutMs: number;
    model: string;
    modelEndpoint: IQualificationAttemptResult['provenance']['modelEndpoint'];
    nodeVersion: string;
    pnpmVersion: string;
    reasoningEffort: string;
    sslCertificateFileSha256: string | null;
  };
  isCompatible: boolean;
  packages: IPublishedPackageIdentity[];
  packagesDigest: string;
  portableSkillBehaviorDigest: string;
  qualificationRepositoryCommit: string;
  selection: IQualificationAttemptResult['selection'];
  skillRepositoryCommit: string;
  skillRepositoryFingerprint: string;
  status: IQualificationAttemptResult['status'];
  targetCompatibilityDigest: string;
  targetDigest: string;
}

// carried source identity required to authorize one bridged Custom baseline
export interface ICompatibilityBridge402QualificationSourceAttestation {
  candidate: {
    cliClosureDigest: string;
    portableSkillBehaviorDigest: string;
  };
  qualification: {
    envelopes: ICompatibilityBridge402QualificationEnvelope[];
  };
}

// candidate identities produced by the exact compatibility-only 4.0.2 projection
export const COMPATIBILITY_BRIDGE_402_CANDIDATE_IDENTITY: Readonly<{
  cliClosureDigest: string;
  portableSkillBehaviorDigest: string;
  semanticCompatibilityDigest: string;
}>;

export const parseCompatibilityBridge402Attestation: (
  input: unknown,
) => ICompatibilityBridge402Attestation;
export const readCompatibilityBridge402Attestation: (
  repositoryRoot: string,
) => ICompatibilityBridge402Attestation | null;
export const mapCompatibilityBridge402Packages: (
  attestation: {
    packages: Pick<ICompatibilityBridge402Attestation['packages'], 'packageDigests'>;
  },
  sourcePackages: IPublishedPackageIdentity[],
) => Array<IPublishedPackageIdentity | null>;
export const hasCompatibilityBridge402Qualification: (options: {
  attestation: {
    packages: Pick<ICompatibilityBridge402Attestation['packages'], 'packageDigests'>;
  } | null;
  candidateCliClosureDigest: string;
  candidatePackages: IPublishedPackageIdentity[];
  candidatePortableSkillBehaviorDigest: string;
  result: IQualificationAttemptResult;
  sourceAttestation: ICompatibilityBridge402QualificationSourceAttestation | null;
  storage: IQualificationAttemptStorage;
}) => boolean;
export const hasLocalCompatibilityBridge402Qualification: (options: {
  candidateCliClosureDigest: string;
  candidatePackages: IPublishedPackageIdentity[];
  candidatePortableSkillBehaviorDigest: string;
  repositoryRoot: string;
  result: IQualificationAttemptResult;
  storage: IQualificationAttemptStorage;
}) => boolean;
export const resolveCompatibleHistoricalSemanticAttemptId: (options: {
  attestation: ICarryForward401Attestation | null;
  compatibilityBridge402?: ICompatibilityBridge402Attestation | null;
  candidateCliClosureDigest: string | null;
  candidatePortableSkillBehaviorDigest: string | null;
  candidateSemanticCompatibilityDigest: string | null;
  semanticResultSha256: string | null;
}) => string | null;
