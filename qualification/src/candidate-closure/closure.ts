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
  typeScriptPackage: CachedCandidatePackageSchema.extend({ name: z.literal('typescript') }),
});

const createCandidateFingerprint = (
  adapterPackage: string,
  cliJsonSchemaVersion: number,
  manifests: readonly IPublishedPackageManifest[],
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
  typeScriptPackage: ICandidatePackage;
};

const hasExpectedPackageIdentity = (
  candidatePackage: Omit<ICandidatePackage, 'tarballPath'>,
  manifest: IPublishedPackageManifest,
): boolean =>
  candidatePackage.name === manifest.name &&
  candidatePackage.version === manifest.version &&
  candidatePackage.registryIntegrity === manifest.dist.integrity &&
  candidatePackage.registryShasum === manifest.dist.shasum &&
  candidatePackage.registryTarballUrl === manifest.dist.tarball;

const validateCachedCandidate = async (options: {
  adapterPackage: string;
  cacheDirectory: string;
  expectedFingerprint: string;
  manifests: readonly IPublishedPackageManifest[];
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
    if (!hasExpectedPackageIdentity(cachedManifest.typeScriptPackage, options.typeScriptManifest)) {
      return null;
    }

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
    const typeScriptTarballPath = path.join(
      options.cacheDirectory,
      'fixture-tools',
      cachedManifest.typeScriptPackage.tarballName,
    );
    if (
      (await calculateFileSha256(typeScriptTarballPath)) !== cachedManifest.typeScriptPackage.sha256
    ) {
      return null;
    }
    return {
      packages,
      typeScriptPackage: {
        ...cachedManifest.typeScriptPackage,
        tarballPath: typeScriptTarballPath,
      },
    };
  } catch {
    return null;
  }
};

const installCandidateRuntime = async (
  packages: readonly ICandidatePackage[],
  typeScriptPackage: ICandidatePackage,
  runtimeDirectory: string,
  storeDirectory: string,
  signal: AbortSignal | undefined,
): Promise<void> => {
  await rm(runtimeDirectory, { force: true, recursive: true });
  await ensureDirectory(runtimeDirectory);
  const localDependencies = Object.fromEntries(
    [...packages, typeScriptPackage].map((candidatePackage) => [
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
  });
  const typeScriptManifest = await resolvePublishedPackageManifest({
    packageName: 'typescript',
    version: qualificationManifest.devDependencies.typescript,
  });
  const fingerprint = createCandidateFingerprint(
    options.adapterPackage,
    cliJsonSchemaVersion,
    manifests,
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
    typeScriptManifest,
  });

  if (candidate === null) {
    await rm(cacheDirectory, { force: true, recursive: true });
    const packages = await downloadPublishedPackageClosure({
      artifactDirectory: cacheDirectory,
      manifests,
      selectedPackageName: options.adapterPackage,
    });
    const typeScriptPackage = await downloadPublishedPackageArtifact({
      artifactDirectory: path.join(cacheDirectory, 'fixture-tools'),
      manifest: typeScriptManifest,
    });
    await writeJsonFileAtomically(path.join(cacheDirectory, 'candidate.json'), {
      fingerprint,
      packages: packages.map(createPublicCandidatePackage),
      typeScriptPackage: createPublicCandidatePackage(typeScriptPackage),
    });
    candidate = { packages, typeScriptPackage };
  }

  await installCandidateRuntime(
    candidate.packages,
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
    typeScriptPackage: candidate.typeScriptPackage,
    runtimeDirectory,
  });
};
