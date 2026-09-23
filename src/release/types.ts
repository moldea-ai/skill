import type { IEvidenceKind } from '../evidence/index.ts';

export type IReleasePackageManifest = {
  devDependencies: Record<string, string>;
  moldeaRelease: {
    cliJsonSchemaVersion: number;
    coreVersionRange: string;
  };
  version: string;
};

export type IReleasePackageLock = {
  packages: Record<
    string,
    {
      dependencies?: Record<string, string> | undefined;
      devDependencies?: Record<string, string> | undefined;
      integrity?: string | undefined;
      version?: string | undefined;
    }
  >;
};

export type IReleaseIdentity = {
  cliCoreVersionRange: string;
  cliDependencies: Record<string, string>;
  cliIntegrity: string;
  cliJsonSchemaVersion: number;
  cliVersion: string;
  cliVersionRange: string;
  coreIntegrity: string;
  coreVersion: string;
  coreVersionRange: string;
  packageLock: IReleasePackageLock;
  packageLockSha256: string;
  packageManifest: IReleasePackageManifest;
  releaseVersion: string;
};

export type IGitHubReleaseAsset = {
  name: string;
  size: number;
};

export type IGitHubRelease = {
  assets: IGitHubReleaseAsset[];
  isDraft: boolean;
  tag: string;
};

export type IGitHubReleaseClient = {
  createDraft: (options: {
    notes: string;
    repository: string;
    tag: string;
    title: string;
  }) => Promise<void>;
  downloadAsset: (options: {
    assetName: string;
    destinationPath: string;
    repository: string;
    tag: string;
  }) => Promise<void>;
  getRelease: (repository: string, tag: string) => Promise<IGitHubRelease | null>;
  publishDraft: (repository: string, tag: string) => Promise<void>;
  uploadAsset: (options: { assetPath: string; repository: string; tag: string }) => Promise<void>;
};

export type IPublishEvidenceBundleOptions = {
  bundle: unknown;
  client?: IGitHubReleaseClient;
  repository: string;
  tag: string;
  temporaryDirectory: string;
};

export type IPublishedEvidenceBundle = {
  assetName: string;
  kind: IEvidenceKind;
  repository: string;
  sha256: string;
  tag: string;
};
