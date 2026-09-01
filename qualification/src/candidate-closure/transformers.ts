import type { ICandidatePackage } from '../contracts/index.ts';

/** Removes the host-local tarball path from one candidate package identity. */
export const createPublicCandidatePackage = (
  candidatePackage: ICandidatePackage,
): Omit<ICandidatePackage, 'tarballPath'> => ({
  name: candidatePackage.name,
  version: candidatePackage.version,
  registryIntegrity: candidatePackage.registryIntegrity,
  registryShasum: candidatePackage.registryShasum,
  registryTarballUrl: candidatePackage.registryTarballUrl,
  tarballName: candidatePackage.tarballName,
  sha256: candidatePackage.sha256,
});
