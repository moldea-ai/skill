// package manifest fields required for local closure resolution and exact packing
export type ILocalPackageManifest = {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  projectDirectory: string;
};

export type ICandidatePreparationOptions = {
  adapterPackage: string;
  attemptDirectory: string;
  packagesDigest: string;
  signal?: AbortSignal | undefined;
};
