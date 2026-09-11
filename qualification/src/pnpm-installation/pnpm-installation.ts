import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { IQualificationPnpmInstallation, IQualificationPnpmPackage } from './types.ts';

const NPM_PUBLIC_REGISTRY_URL = 'https://registry.npmjs.org/';

/**
 * Creates the isolated pnpm paths and environment for one qualification attempt.
 * @param attemptDirectory The qualification-owned attempt root.
 * @param registryUrl The verified package registry used for exact resolution.
 * @returns Attempt-local package content and metadata configuration.
 */
export const createQualificationPnpmInstallation = (
  attemptDirectory: string,
  registryUrl = NPM_PUBLIC_REGISTRY_URL,
): IQualificationPnpmInstallation => {
  const cacheDirectory = path.join(attemptDirectory, 'pnpm-cache');

  return {
    cacheDirectory,
    configPath: path.join(cacheDirectory, 'pnpm-userconfig'),
    environment: {
      ...process.env,
      CI: 'true',
      XDG_CACHE_HOME: cacheDirectory,
    },
    registryUrl,
    storeDirectory: path.join(attemptDirectory, 'pnpm-store'),
  };
};

/** Creates one deterministic exact-version map and rejects duplicate package identities. */
export const createQualificationPnpmPackageVersions = (
  packages: readonly IQualificationPnpmPackage[],
): Record<string, string> => {
  const versions: Record<string, string> = {};

  for (const packageIdentity of packages) {
    if (versions[packageIdentity.name] !== undefined) {
      throw new Error(`Duplicate qualification package identity: ${packageIdentity.name}.`);
    }
    versions[packageIdentity.name] = packageIdentity.version;
  }

  return versions;
};

/** Creates the empty attempt-owned pnpm user configuration before package installation. */
export const initializeQualificationPnpmInstallation = async (
  installation: IQualificationPnpmInstallation,
): Promise<void> => {
  await mkdir(installation.cacheDirectory, { recursive: true });
  await writeFile(installation.configPath, '', 'utf8');
};

/** Returns the common explicit pnpm options that isolate one qualification attempt. */
export const createQualificationPnpmOptions = (
  installation: IQualificationPnpmInstallation,
): string[] => [
  '--userconfig',
  installation.configPath,
  '--registry',
  installation.registryUrl,
  '--store-dir',
  installation.storeDirectory,
];
