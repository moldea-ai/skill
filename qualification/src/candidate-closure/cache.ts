import { readFile } from 'node:fs/promises';

import {
  verifyPublishedPackageArchive,
  type IPublishedPackageManifest,
} from '../../../tooling/package-candidate/index.mjs';

import type { ICandidatePackage } from '../contracts/index.ts';
import { resolveContainedPath } from '../filesystem/index.ts';
import type { ICachedCandidatePackage } from './types.ts';

const hasExpectedPackageIdentity = (
  candidatePackage: ICachedCandidatePackage,
  manifest: IPublishedPackageManifest,
): boolean =>
  candidatePackage.name === manifest.name &&
  candidatePackage.version === manifest.version &&
  candidatePackage.registryIntegrity === manifest.dist.integrity &&
  candidatePackage.registryShasum === manifest.dist.shasum &&
  candidatePackage.registryTarballUrl === manifest.dist.tarball;

/**
 * Loads one cache entry only when its path, registry identity, and archive bytes remain exact.
 * @returns The verified package or `null` when the cache entry must be rebuilt.
 */
export const loadVerifiedCachedPackage = async (options: {
  cacheDirectory: string;
  cachedPackage: ICachedCandidatePackage;
  manifest: IPublishedPackageManifest;
  relativeDirectory?: string;
}): Promise<ICandidatePackage | null> => {
  try {
    if (!hasExpectedPackageIdentity(options.cachedPackage, options.manifest)) return null;

    const packageDirectory = resolveContainedPath(
      options.cacheDirectory,
      options.relativeDirectory ?? '.',
    );
    const expectedTarballName = new URL(options.manifest.dist.tarball).pathname.split('/').at(-1);

    if (
      expectedTarballName === undefined ||
      options.cachedPackage.tarballName !== expectedTarballName
    ) {
      return null;
    }

    const tarballPath = resolveContainedPath(packageDirectory, expectedTarballName);
    const archive = await readFile(tarballPath);
    const verifiedArchive = verifyPublishedPackageArchive({
      archive,
      manifest: options.manifest,
    });

    if (
      verifiedArchive.tarballName !== expectedTarballName ||
      verifiedArchive.sha256 !== options.cachedPackage.sha256
    ) {
      return null;
    }

    return { ...options.cachedPackage, tarballPath };
  } catch {
    return null;
  }
};
