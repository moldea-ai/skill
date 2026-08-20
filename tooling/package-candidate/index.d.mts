/// <reference types="node" />

// packed candidate contracts exposed to development-only consumers
export type IPackageCandidateManifest = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  preferUnplugged?: boolean;
};

export type IPackageCandidateArtifact = {
  archive: Buffer;
  archiveName: string;
  manifest: IPackageCandidateManifest;
};

export type IValidatedPackageCandidate = {
  artifacts: Map<string, IPackageCandidateArtifact>;
  cliVersion: string;
};

// source workspace contracts used for dependency-first build and packing
export type ISourcePackageManifest = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  name: string;
  optionalDependencies: Record<string, string>;
  projectDirectory: string;
  version: string;
};

export type ISourceCandidatePlan = {
  buildClosure: ISourcePackageManifest[];
  manifests: Map<string, ISourcePackageManifest>;
  runtimeClosure: ISourcePackageManifest[];
};

export const createSourceCandidatePlan: (
  workspaceRoot: string,
  selectedRootPackageNames?: string[],
) => ISourceCandidatePlan;

export const loadCandidateArtifacts: (
  artifactDirectory: string,
  selectedRootPackageNames?: string[],
) => IValidatedPackageCandidate;
