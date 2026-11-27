import type { IEvidenceKind } from '../evidence/index.ts';

// npm lock and shipped composition provenance of the skill release
export type IReleaseIdentity = {
  checksums: string;
  cliIntegrity: string;
  cliJsonSchemaVersion: number;
  cliVersion: string;
  coreVersion: string;
  packageLockSha256: string;
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
