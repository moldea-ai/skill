import { rm } from 'node:fs/promises';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import {
  downloadPublishedPackageClosure,
  loadCandidateArtifacts,
  resolvePublishedPackageClosure,
  type IPublishedPackageManifest,
} from '../../../tooling/package-candidate/index.mjs';

import { LOCAL_QUALIFICATION_ROOT, SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import {
  CandidateClosureSchema,
  type ICandidateClosure,
  type ICandidatePackage,
} from '../contracts/index.ts';
import {
  calculateFileSha256,
  calculateSha256,
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { createPublicCandidatePackage } from './transformers.ts';
import type { ICandidatePreparationOptions } from './types.ts';

const ReleaseManifestSchema = z.object({
  devDependencies: z.object({ '@moldea.ai/cli': z.string().regex(/^\d+\.\d+\.\d+$/u) }),
  moldeaRelease: z.object({ cliJsonSchemaVersion: z.number().int().positive() }),
});

const CachedCandidateManifestSchema = z.strictObject({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  packages: z.array(
    z.strictObject({
      name: z.string(),
      version: z.string(),
      registryIntegrity: z.string().startsWith('sha512-'),
      registryShasum: z.string().regex(/^[a-f0-9]{40}$/u),
      registryTarballUrl: z.url().startsWith('https://registry.npmjs.org/'),
      tarballName: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    }),
  ),
});

const createCandidateFingerprint = (
  adapterPackage: string,
  cliJsonSchemaVersion: number,
  manifests: readonly IPublishedPackageManifest[],
): string =>
  calculateSha256(
    `${JSON.stringify({
      adapterPackage,
      cliJsonSchemaVersion,
      packages: manifests.map(({ dist, name, version }) => ({
        integrity: dist.integrity,
        name,
        shasum: dist.shasum,
        tarball: dist.tarball,
        version,
      })),
    })}\n`,
  );

const validateCachedCandidate = async (options: {
  adapterPackage: string;
  cacheDirectory: string;
  expectedFingerprint: string;
  manifests: readonly IPublishedPackageManifest[];
}): Promise<ICandidatePackage[] | null> => {
  try {
    const cachedManifest = await readJsonFile(
      path.join(options.cacheDirectory, 'candidate.json'),
      CachedCandidateManifestSchema,
    );
    if (cachedManifest.fingerprint !== options.expectedFingerprint) return null;

    const expectedPackages = options.manifests.map(({ dist, name, version }) => ({
      name,
      registryIntegrity: dist.integrity,
      registryShasum: dist.shasum,
      registryTarballUrl: dist.tarball,
      version,
    }));
    const cachedPackages = cachedManifest.packages.map(
      ({ name, registryIntegrity, registryShasum, registryTarballUrl, version }) => ({
        name,
        registryIntegrity,
        registryShasum,
        registryTarballUrl,
        version,
      }),
    );
    if (JSON.stringify(cachedPackages) !== JSON.stringify(expectedPackages)) return null;

    const candidate = loadCandidateArtifacts(options.cacheDirectory, [options.adapterPackage]);
    const packages: ICandidatePackage[] = [];
    for (const cachedPackage of cachedManifest.packages) {
      const artifact = candidate.artifacts.get(cachedPackage.name);
      const tarballPath = path.join(options.cacheDirectory, cachedPackage.tarballName);
      if (
        artifact === undefined ||
        artifact.archiveName !== cachedPackage.tarballName ||
        artifact.manifest.version !== cachedPackage.version ||
        (await calculateFileSha256(tarballPath)) !== cachedPackage.sha256
      ) {
        return null;
      }
      packages.push({ ...cachedPackage, tarballPath });
    }
    return packages;
  } catch {
    return null;
  }
};

const installCandidateRuntime = async (
  packages: readonly ICandidatePackage[],
  runtimeDirectory: string,
  signal: AbortSignal | undefined,
): Promise<void> => {
  await rm(runtimeDirectory, { force: true, recursive: true });
  await ensureDirectory(runtimeDirectory);
  const localDependencies = Object.fromEntries(
    packages.map((candidatePackage) => [
      candidatePackage.name,
      `file:${candidatePackage.tarballPath}`,
    ]),
  );

  await writeJsonFileAtomically(path.join(runtimeDirectory, 'package.json'), {
    name: 'moldea-qualification-runtime',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: localDependencies,
  });
  await writeTextFileAtomically(
    path.join(runtimeDirectory, 'pnpm-workspace.yaml'),
    stringifyYaml({ overrides: localDependencies }),
  );
  await executeProcess({
    command: 'pnpm',
    args: ['install', '--offline', '--ignore-scripts', '--config.strict-peer-dependencies=true'],
    cwd: runtimeDirectory,
    environment: { ...process.env, CI: 'true' },
    signal,
  });
};

/** Resolves, verifies, caches, and installs one exact published package closure. */
export const prepareCandidateClosure = async (
  options: ICandidatePreparationOptions,
): Promise<ICandidateClosure> => {
  const releaseManifest = await readJsonFile(
    path.join(SKILL_REPOSITORY_ROOT, 'package.json'),
    ReleaseManifestSchema,
  );
  const cliVersion = releaseManifest.devDependencies['@moldea.ai/cli'];
  const cliJsonSchemaVersion = releaseManifest.moldeaRelease.cliJsonSchemaVersion;
  const manifests = await resolvePublishedPackageClosure({
    cliVersion,
    selectedPackageName: options.adapterPackage,
  });
  const fingerprint = createCandidateFingerprint(
    options.adapterPackage,
    cliJsonSchemaVersion,
    manifests,
  );
  const cacheDirectory = path.join(LOCAL_QUALIFICATION_ROOT, 'candidates', fingerprint);
  const runtimeDirectory = path.join(options.attemptDirectory, 'runtime');
  let packages = await validateCachedCandidate({
    adapterPackage: options.adapterPackage,
    cacheDirectory,
    expectedFingerprint: fingerprint,
    manifests,
  });

  if (packages === null) {
    await rm(cacheDirectory, { force: true, recursive: true });
    packages = await downloadPublishedPackageClosure({
      artifactDirectory: cacheDirectory,
      manifests,
      selectedPackageName: options.adapterPackage,
    });
    await writeJsonFileAtomically(path.join(cacheDirectory, 'candidate.json'), {
      fingerprint,
      packages: packages.map(createPublicCandidatePackage),
    });
  }

  await installCandidateRuntime(packages, runtimeDirectory, options.signal);
  return CandidateClosureSchema.parse({
    cliJsonSchemaVersion,
    cliVersion,
    fingerprint,
    packages,
    runtimeDirectory,
  });
};
