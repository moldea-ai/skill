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

export type IPublishedPackageManifest = IPackageCandidateManifest & {
  dependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  dist: {
    integrity: string;
    shasum: string;
    tarball: string;
  };
};

export type IPublishedCandidatePackage = {
  name: string;
  version: string;
  registryIntegrity: string;
  registryShasum: string;
  registryTarballUrl: string;
  sha256: string;
  tarballName: string;
  tarballPath: string;
};

export const resolvePublishedPackageClosure: (options: {
  cliVersion: string;
  fetchResource?: typeof fetch;
  selectedPackageName: string;
}) => Promise<IPublishedPackageManifest[]>;

export const resolvePublishedPackageManifest: (options: {
  fetchResource?: typeof fetch;
  packageName: string;
  version: string;
}) => Promise<IPublishedPackageManifest>;

export const downloadPublishedPackageArtifact: (options: {
  artifactDirectory: string;
  fetchResource?: typeof fetch;
  manifest: IPublishedPackageManifest;
}) => Promise<IPublishedCandidatePackage>;

export const downloadPublishedPackageClosure: (options: {
  artifactDirectory: string;
  fetchResource?: typeof fetch;
  manifests: IPublishedPackageManifest[];
  selectedPackageName: string;
}) => Promise<IPublishedCandidatePackage[]>;

export const verifyPublishedPackageArchive: (options: {
  archive: Buffer;
  manifest: IPublishedPackageManifest;
}) => {
  sha256: string;
  tarballName: string;
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
