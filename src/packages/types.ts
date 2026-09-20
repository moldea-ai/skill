import type { Server } from 'node:http';

// package manifests used by packed and published candidate closures
export interface IPackageCandidateManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  preferUnplugged?: boolean;
}

export interface IPackageCandidateArtifact {
  archive: Buffer;
  archiveName: string;
  manifest: IPackageCandidateManifest;
}

export interface IValidatedPackageCandidate {
  artifacts: Map<string, IPackageCandidateArtifact>;
  cliVersion: string;
}

export interface IPublishedPackageManifest extends IPackageCandidateManifest {
  dependencies: Record<string, string>;
  optionalDependencies: Record<string, string>;
  dist: {
    integrity: string;
    shasum: string;
    tarball: string;
  };
}

export interface IPublishedCandidatePackage {
  name: string;
  version: string;
  registryIntegrity: string;
  registryShasum: string;
  registryTarballUrl: string;
  sha256: string;
  tarballName: string;
  tarballPath: string;
}

export interface ISourcePackageManifest {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  name: string;
  optionalDependencies: Record<string, string>;
  projectDirectory: string;
  version: string;
}

export interface ISourceCandidatePlan {
  buildClosure: ISourcePackageManifest[];
  manifests: Map<string, ISourcePackageManifest>;
  runtimeClosure: ISourcePackageManifest[];
}

export interface ICandidateRegistry {
  registryUrl: string;
  server: Server;
}

export type IFetchResource = typeof fetch;

export type IPackSourceWorkspaceCandidateOptions = {
  artifactDirectory: string;
  executeCommand?: (options: { args: string[]; cwd: string }) => void;
  loadArtifacts?: (
    artifactDirectory: string,
    selectedRootPackageNames?: string[],
  ) => IValidatedPackageCandidate;
  runtimeCompatibilityPublicationPath?: string;
  selectedRootPackageNames?: string[];
  workspaceRoot: string;
};

export type ICliClosureEdgeField = 'dependencies' | 'optionalDependencies' | 'peerDependencies';

export interface ICliClosureEdge {
  field: ICliClosureEdgeField;
  name: string;
  requested: string;
  resolvedPackageKey: string | null;
}

export interface ICliClosurePackage {
  edges: ICliClosureEdge[];
  integrity: string;
  packageKey: string;
  version: string;
}

export interface ICliClosureIdentity {
  cliDeclaration: string;
  cliJsonSchemaVersion: number;
  packages: ICliClosurePackage[];
  schemaVersion: 1;
}
