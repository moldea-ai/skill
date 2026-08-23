import type { ICandidatePackage } from '../contracts/index.ts';

export type ICachedCandidatePackage = Omit<ICandidatePackage, 'tarballPath'>;

export type ICandidatePreparationOptions = {
  adapterPackage: string;
  attemptDirectory: string;
  runtimePackages?: readonly {
    name: string;
    version: string;
  }[];
  signal?: AbortSignal | undefined;
};
