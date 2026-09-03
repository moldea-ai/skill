/// <reference types="node" />

import type { ICompatibilityContract } from './compatibility.mjs';

// frozen bridge identities and literal source inventories
export const COMPATIBILITY_BRIDGE_402_PATH: string;
export const COMPATIBILITY_BRIDGE_402_SCHEMA_VERSION: 1;
export const SKILL_400_COMMIT: string;
export const SKILL_401_COMMIT: string;
export const PACKAGES_SOURCE_BASELINE_COMMIT: string;
export const PACKAGES_SOURCE_BASELINE_TREE: string;
export const SKILL_402_CHANGED_PATHS: readonly string[];
export const PACKAGES_402_CHANGED_PATHS: readonly string[];
export const PACKAGE_VERSION_MAP: Readonly<
  Record<string, Readonly<{ source: string; candidate: string }>>
>;

export interface IGitCommandResult {
  status: number | null;
  stderr: Buffer;
  stdout: Buffer;
}

export type IExecuteGitCommand = (
  repositoryRoot: string,
  arguments_: string[],
) => IGitCommandResult;

export interface IFileIdentity {
  path: string;
  sha256: string;
}

export interface ISourceFileIdentity {
  candidateSha256: string;
  path: string;
  sourceSha256: string | null;
}

export interface ISourceDeltaIdentity {
  digest: string;
  files: ISourceFileIdentity[];
}

export interface ICompatibilityDecision {
  candidate: boolean;
  fieldName: string;
  sourceApplicable: boolean;
  sourceDeclared: boolean;
  version: string;
}

export interface ICompatibilityDecisionIdentity {
  decisions: ICompatibilityDecision[];
  digest: string;
}

export interface IPackageArchiveEntry {
  content: Buffer;
  linkPath: string;
  mode: number;
  type: string;
}

export interface IRegistryIdentity {
  integrity: string;
  shasum: string;
  tarball: string;
}

export interface IPackageArtifact {
  archive: Buffer;
  archiveName: string;
  entries: Map<string, IPackageArchiveEntry>;
  manifest: Record<string, unknown>;
  registry?: IRegistryIdentity;
}

export interface IPackageDigest {
  candidateSha256: string;
  name: string;
  registry: {
    candidate: IRegistryIdentity | null;
    source: IRegistryIdentity | null;
  };
  sourceSha256: string;
}

export interface IFrozenCompatibilitySurface {
  files: IFileIdentity[];
  runtimeImportClosure: IFileIdentity[];
  scripts: { checkPackages: string; write: string };
}

export interface IPackagesGateIdentity {
  artifactNames: string[];
  pinnedSkillCommit: string;
  verifierSources: IFileIdentity[];
  workflowSha256: string;
}

export interface IPackagesSourceState {
  baselineCommit: string;
  baselineTree: string;
  candidateCommit: string;
  changedPaths: string[];
  sourceDelta: ISourceDeltaIdentity;
}

export interface ISkillCompatibilityProjection {
  digest: string;
  files: Array<{ candidateSha256: string; path: string; sourceSha256: string }>;
}

export interface ISkillSourceState {
  candidateCommit: string;
  compatibilityProjection: ISkillCompatibilityProjection;
  changedPaths: string[];
  sourceDelta: ISourceDeltaIdentity;
}

export interface IPackageTagIdentity {
  packageName: string;
  tag: string;
  tagCommit: string;
}

export interface IPackageTagsIdentity {
  candidate: IPackageTagIdentity[];
  source: IPackageTagIdentity[];
}

export interface IGitFileInventory {
  digest: string;
  entries: IFileIdentity[];
}

export interface IRetainedAttemptInventories {
  qualification: { candidate: IGitFileInventory; source: IGitFileInventory };
  semantic: { candidate: IGitFileInventory; source: IGitFileInventory };
}

export interface ICompatibilityBridge402Attestation {
  schemaVersion: 1;
  sourceRelease: string;
  sourceCommit: string;
  targetRelease: string;
  modelRunsPerformed: false;
  compatibility: {
    source: Readonly<ICompatibilityContract>;
    candidate: Readonly<ICompatibilityContract>;
    decisions: ICompatibilityDecision[];
    decisionDigest: string;
    digest: string;
  };
  carryForward401: {
    files: IFileIdentity[];
    originalSourceCommit: string;
    sourceCommit: string;
  };
  frozenSurface: IFrozenCompatibilitySurface;
  gate: IPackagesGateIdentity;
  packages: {
    packageDigests: IPackageDigest[];
    packageTags: IPackageTagsIdentity;
    sourceState: IPackagesSourceState;
  };
  retainedAttempts: IRetainedAttemptInventories;
  skill: ISkillSourceState;
}

export interface ICompatibilityBridgePackagesCheck {
  compatibilityDecisions: ICompatibilityDecisionIdentity;
  comparatorCommit: string;
  frozenSurface: IFrozenCompatibilitySurface;
  gate: IPackagesGateIdentity;
  packageDigests: IPackageDigest[];
  sourceState: IPackagesSourceState;
}

export interface ICompatibilityBridgeOptions {
  executeGitCommand?: IExecuteGitCommand;
  fetchResource?: typeof fetch;
  packagesCommit: string;
  packagesRepository: string;
  repositoryRoot: string;
}

export const readPackageArchive: (archive: Buffer) => Map<string, IPackageArchiveEntry>;
export const loadCandidatePackageArtifacts: (
  artifactDirectory: string,
) => Map<string, IPackageArtifact>;
export const loadPublishedPackageArtifacts: (options: {
  candidate: boolean;
  fetchResource?: typeof fetch;
}) => Promise<Map<string, IPackageArtifact>>;
export const comparePackageArtifactSets: (
  sourceArtifacts: Map<string, IPackageArtifact>,
  candidateArtifacts: Map<string, IPackageArtifact>,
) => IPackageDigest[];
export const assertPackagesSourceState: (options: {
  executeGitCommand?: IExecuteGitCommand;
  packagesCommit: string;
  packagesRepository: string;
}) => IPackagesSourceState;
export const createRuntimeImportClosure: (repositoryRoot: string) => IFileIdentity[];
export const createFrozenCompatibilitySurface: (
  repositoryRoot: string,
) => IFrozenCompatibilitySurface;
export const compareSkillCompatibilityFiles: (
  sourceFiles: Map<string, Buffer>,
  candidateFiles: Map<string, Buffer>,
) => ISkillCompatibilityProjection;
export const compareSkillPackageLocks: (
  source: Record<string, unknown>,
  candidate: Record<string, unknown>,
) => void;
export const checkCompatibilityBridgePackages: (
  options: Omit<ICompatibilityBridgeOptions, 'repositoryRoot'> & {
    artifactDirectory: string;
    repositoryRoot?: string;
  },
) => Promise<ICompatibilityBridgePackagesCheck>;
export const createCompatibilityBridge402Attestation: (
  options: ICompatibilityBridgeOptions,
) => Promise<ICompatibilityBridge402Attestation>;
export const writeCompatibilityBridge402Attestation: (
  options: ICompatibilityBridgeOptions,
) => Promise<ICompatibilityBridge402Attestation>;
