import { rm } from 'node:fs/promises';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import {
  downloadPublishedPackageArtifact,
  downloadPublishedPackageClosure,
  loadCandidateArtifacts,
  resolvePublishedPackageClosure,
  resolvePublishedPackageManifest,
  type IPublishedPackageManifest,
} from '../../../tooling/package-candidate/index.mjs';

import {
  LOCAL_QUALIFICATION_ROOT,
  QUALIFICATION_ROOT,
  SKILL_REPOSITORY_ROOT,
} from '../constants/index.ts';
import {
  CandidateClosureSchema,
  type ICandidateClosure,
  type ICandidatePackage,
} from '../contracts/index.ts';
import {
  calculateSha256,
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomically,
  writeTextFileAtomically,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import { loadVerifiedCachedPackage } from './cache.ts';
import { createPublicCandidatePackage } from './transformers.ts';
import type { ICandidatePreparationOptions } from './types.ts';

const ReleaseManifestSchema = z.object({
  devDependencies: z.object({ '@moldea.ai/cli': z.string().regex(/^\d+\.\d+\.\d+$/u) }),
  moldeaRelease: z.object({ cliJsonSchemaVersion: z.number().int().positive() }),
});

const QualificationManifestSchema = z.object({
  devDependencies: z.object({ typescript: z.string().regex(/^\d+\.\d+\.\d+$/u) }),
});

const CachedCandidatePackageSchema = z.strictObject({
  name: z.string(),
  version: z.string(),
  registryIntegrity: z.string().startsWith('sha512-'),
  registryShasum: z.string().regex(/^[a-f0-9]{40}$/u),
  registryTarballUrl: z.url().startsWith('https://registry.npmjs.org/'),
  tarballName: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
});

const CachedCandidateManifestSchema = z.strictObject({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  packages: z.array(CachedCandidatePackageSchema),
  runtimePackages: z.array(CachedCandidatePackageSchema).optional(),
  typeScriptPackage: CachedCandidatePackageSchema.extend({ name: z.literal('typescript') }),
});

const createCandidateFingerprint = (
  adapterPackage: string,
  cliJsonSchemaVersion: number,
  manifests: readonly IPublishedPackageManifest[],
  runtimePackageManifests: readonly IPublishedPackageManifest[],
  typeScriptManifest: IPublishedPackageManifest,
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
      ...(runtimePackageManifests.length === 0
        ? {}
        : {
            runtimePackages: runtimePackageManifests.map(({ dist, name, version }) => ({
              integrity: dist.integrity,
              name,
              shasum: dist.shasum,
              tarball: dist.tarball,
              version,
            })),
          }),
      typeScriptPackage: {
        integrity: typeScriptManifest.dist.integrity,
        name: typeScriptManifest.name,
        shasum: typeScriptManifest.dist.shasum,
        tarball: typeScriptManifest.dist.tarball,
        version: typeScriptManifest.version,
      },
    })}\n`,
  );

type IValidatedCachedCandidate = {
  packages: ICandidatePackage[];
  runtimePackages: ICandidatePackage[];
  typeScriptPackage: ICandidatePackage;
};

const validateCachedCandidate = async (options: {
  adapterPackage: string;
  cacheDirectory: string;
  expectedFingerprint: string;
  manifests: readonly IPublishedPackageManifest[];
  runtimePackageManifests: readonly IPublishedPackageManifest[];
  typeScriptManifest: IPublishedPackageManifest;
}): Promise<IValidatedCachedCandidate | null> => {
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
    const cachedRuntimePackages = cachedManifest.runtimePackages ?? [];

    if (
      cachedRuntimePackages.length !== options.runtimePackageManifests.length ||
      cachedRuntimePackages.some(
        (runtimePackage, index) =>
          runtimePackage.name !== options.runtimePackageManifests[index]?.name,
      )
    ) {
      return null;
    }

    const candidate = loadCandidateArtifacts(options.cacheDirectory, [options.adapterPackage]);
    const packages: ICandidatePackage[] = [];
    for (const [index, cachedPackage] of cachedManifest.packages.entries()) {
      const manifest = options.manifests[index];

      if (manifest === undefined) return null;

      const artifact = candidate.artifacts.get(cachedPackage.name);
      const verifiedPackage = await loadVerifiedCachedPackage({
        cacheDirectory: options.cacheDirectory,
        cachedPackage,
        manifest,
      });
      if (
        artifact === undefined ||
        verifiedPackage === null ||
        artifact.archiveName !== verifiedPackage.tarballName ||
        artifact.manifest.version !== cachedPackage.version ||
        calculateSha256(artifact.archive) !== verifiedPackage.sha256
      ) {
        return null;
      }
      packages.push(verifiedPackage);
    }
    const typeScriptPackage = await loadVerifiedCachedPackage({
      cacheDirectory: options.cacheDirectory,
      cachedPackage: cachedManifest.typeScriptPackage,
      manifest: options.typeScriptManifest,
      relativeDirectory: 'fixture-tools',
    });

    if (typeScriptPackage === null) return null;

    const runtimePackages: ICandidatePackage[] = [];

    for (const [index, cachedRuntimePackage] of cachedRuntimePackages.entries()) {
      const manifest = options.runtimePackageManifests[index];

      if (manifest === undefined) return null;

      const runtimePackage = await loadVerifiedCachedPackage({
        cacheDirectory: options.cacheDirectory,
        cachedPackage: cachedRuntimePackage,
        manifest,
        relativeDirectory: 'fixture-runtime',
      });

      if (runtimePackage === null) return null;

      runtimePackages.push(runtimePackage);
    }

    return {
      packages,
      runtimePackages,
      typeScriptPackage,
    };
  } catch {
    return null;
  }
};

const installCandidateRuntime = async (
  packages: readonly ICandidatePackage[],
  runtimePackages: readonly ICandidatePackage[],
  typeScriptPackage: ICandidatePackage,
  runtimeDirectory: string,
  storeDirectory: string,
  signal: AbortSignal | undefined,
): Promise<void> => {
  await rm(runtimeDirectory, { force: true, recursive: true });
  await ensureDirectory(runtimeDirectory);
  const localDependencies = Object.fromEntries(
    [...packages, ...runtimePackages, typeScriptPackage].map((candidatePackage) => [
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
    args: [
      'install',
      '--prefer-offline',
      '--ignore-scripts',
      '--config.strict-peer-dependencies=true',
      '--store-dir',
      storeDirectory,
    ],
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
  const qualificationManifest = await readJsonFile(
    path.join(QUALIFICATION_ROOT, 'package.json'),
    QualificationManifestSchema,
  );
  const cliVersion = releaseManifest.devDependencies['@moldea.ai/cli'];
  const cliJsonSchemaVersion = releaseManifest.moldeaRelease.cliJsonSchemaVersion;
  const manifests = await resolvePublishedPackageClosure({
    cliVersion,
    selectedPackageName: options.adapterPackage,
    signal: options.signal,
  });
  const runtimePackageManifests = await Promise.all(
    (options.runtimePackages ?? []).map(({ name, version }) =>
      resolvePublishedPackageManifest({ packageName: name, signal: options.signal, version }),
    ),
  );
  const candidateOwnedPackageNames = new Set([...manifests.map(({ name }) => name), 'typescript']);
  const conflictingRuntimePackageNames = runtimePackageManifests
    .map(({ name }) => name)
    .filter((packageName) => candidateOwnedPackageNames.has(packageName));

  if (conflictingRuntimePackageNames.length > 0) {
    throw new Error(
      `Qualification runtime packages conflict with candidate-owned packages: ${conflictingRuntimePackageNames.join(', ')}.`,
    );
  }
  const typeScriptManifest = await resolvePublishedPackageManifest({
    packageName: 'typescript',
    signal: options.signal,
    version: qualificationManifest.devDependencies.typescript,
  });
  const fingerprint = createCandidateFingerprint(
    options.adapterPackage,
    cliJsonSchemaVersion,
    manifests,
    runtimePackageManifests,
    typeScriptManifest,
  );
  const cacheDirectory = path.join(LOCAL_QUALIFICATION_ROOT, 'candidates', fingerprint);
  const runtimeDirectory = path.join(options.attemptDirectory, 'runtime');
  const storeDirectory = path.join(options.attemptDirectory, 'pnpm-store');
  let candidate = await validateCachedCandidate({
    adapterPackage: options.adapterPackage,
    cacheDirectory,
    expectedFingerprint: fingerprint,
    manifests,
    runtimePackageManifests,
    typeScriptManifest,
  });

  if (candidate === null) {
    await rm(cacheDirectory, { force: true, recursive: true });
    const packages = await downloadPublishedPackageClosure({
      artifactDirectory: cacheDirectory,
      manifests,
      selectedPackageName: options.adapterPackage,
      signal: options.signal,
    });
    const typeScriptPackage = await downloadPublishedPackageArtifact({
      artifactDirectory: path.join(cacheDirectory, 'fixture-tools'),
      manifest: typeScriptManifest,
      signal: options.signal,
    });
    const runtimePackages = [];

    for (const runtimePackageManifest of runtimePackageManifests) {
      runtimePackages.push(
        await downloadPublishedPackageArtifact({
          artifactDirectory: path.join(cacheDirectory, 'fixture-runtime'),
          manifest: runtimePackageManifest,
          signal: options.signal,
        }),
      );
    }

    await writeJsonFileAtomically(path.join(cacheDirectory, 'candidate.json'), {
      fingerprint,
      packages: packages.map(createPublicCandidatePackage),
      runtimePackages: runtimePackages.map(createPublicCandidatePackage),
      typeScriptPackage: createPublicCandidatePackage(typeScriptPackage),
    });
    candidate = { packages, runtimePackages, typeScriptPackage };
  }

  await installCandidateRuntime(
    candidate.packages,
    candidate.runtimePackages,
    candidate.typeScriptPackage,
    runtimeDirectory,
    storeDirectory,
    options.signal,
  );
  return CandidateClosureSchema.parse({
    cliJsonSchemaVersion,
    cliVersion,
    fingerprint,
    packages: candidate.packages,
    runtimePackages: candidate.runtimePackages,
    typeScriptPackage: candidate.typeScriptPackage,
    runtimeDirectory,
  });
};
