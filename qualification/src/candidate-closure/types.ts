export type ICandidatePreparationOptions = {
  adapterPackage: string;
  attemptDirectory: string;
  packagesDigest: string;
  packagesRepository: string;
  signal?: AbortSignal | undefined;
};
