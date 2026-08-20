import { readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import { LOCAL_QUALIFICATION_ROOT, PACKAGES_REPOSITORY_ROOT } from '../constants/index.ts';
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
import { resolveBuildClosure, resolveRuntimeClosure } from './resolver.ts';
import type { ICandidatePreparationOptions, ILocalPackageManifest } from './types.ts';

const PackageManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
});

const CachedCandidateManifestSchema = z.strictObject({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  packages: z.array(
    z.strictObject({
      name: z.string(),
      version: z.string(),
      projectDirectory: z.string(),
      tarballName: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    }),
  ),
});

const discoverPackageManifests = async (): Promise<Map<string, ILocalPackageManifest>> => {
  const manifests = new Map<string, ILocalPackageManifest>();

  for (const collectionDirectory of ['packages', 'projects']) {
    const collectionPath = path.join(PACKAGES_REPOSITORY_ROOT, collectionDirectory);
    const directoryEntries = await readdir(collectionPath, { withFileTypes: true });

    for (const directoryEntry of directoryEntries) {
      if (!directoryEntry.isDirectory()) {
        continue;
      }

      const projectDirectory = path.join(collectionDirectory, directoryEntry.name);
      const manifestPath = path.join(PACKAGES_REPOSITORY_ROOT, projectDirectory, 'package.json');

      try {
        const source = await readFile(manifestPath, 'utf8');
        const manifest = PackageManifestSchema.parse(JSON.parse(source) as unknown);

        manifests.set(manifest.name, {
          name: manifest.name,
          version: manifest.version,
          dependencies: manifest.dependencies ?? {},
          devDependencies: manifest.devDependencies ?? {},
          projectDirectory,
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ENOENT'
        ) {
          continue;
        }

        throw error;
      }
    }
  }

  return manifests;
};

const validateCachedCandidate = async (
  cacheDirectory: string,
  expectedFingerprint: string,
): Promise<ICandidatePackage[] | null> => {
  const manifestPath = path.join(cacheDirectory, 'candidate.json');

  try {
    const cachedManifest = await readJsonFile(manifestPath, CachedCandidateManifestSchema);

    if (cachedManifest.fingerprint !== expectedFingerprint) {
      return null;
    }

    const packages: ICandidatePackage[] = [];

    for (const candidatePackage of cachedManifest.packages) {
      const tarballPath = path.join(cacheDirectory, candidatePackage.tarballName);

      if ((await calculateFileSha256(tarballPath)) !== candidatePackage.sha256) {
        return null;
      }

      packages.push({ ...candidatePackage, tarballPath });
    }

    return packages;
  } catch {
    return null;
  }
};

const buildAndPackCandidate = async (
  manifests: ReadonlyMap<string, ILocalPackageManifest>,
  runtimeClosure: readonly ILocalPackageManifest[],
  cacheDirectory: string,
  fingerprint: string,
  signal: AbortSignal | undefined,
): Promise<ICandidatePackage[]> => {
  const buildClosure = resolveBuildClosure(manifests, runtimeClosure);

  for (const manifest of buildClosure) {
    await executeProcess({
      command: 'pnpm',
      args: ['--filter', manifest.name, 'build'],
      cwd: PACKAGES_REPOSITORY_ROOT,
      signal,
    });
  }

  await ensureDirectory(cacheDirectory);
  const packages: ICandidatePackage[] = [];

  for (const manifest of runtimeClosure) {
    const existingTarballs = new Set(
      (await readdir(cacheDirectory)).filter((fileName) => fileName.endsWith('.tgz')),
    );

    await executeProcess({
      command: 'pnpm',
      args: [
        '--dir',
        path.join(PACKAGES_REPOSITORY_ROOT, manifest.projectDirectory),
        'pack',
        '--pack-destination',
        cacheDirectory,
      ],
      cwd: PACKAGES_REPOSITORY_ROOT,
      signal,
    });

    const newTarballs = (await readdir(cacheDirectory)).filter(
      (fileName) => fileName.endsWith('.tgz') && !existingTarballs.has(fileName),
    );

    if (newTarballs.length !== 1) {
      throw new Error(`Packing ${manifest.name} did not create exactly one candidate tarball.`);
    }

    const tarballName = newTarballs[0];

    if (tarballName === undefined) {
      throw new Error(`Packing ${manifest.name} did not report a candidate tarball.`);
    }

    const tarballPath = path.join(cacheDirectory, tarballName);

    packages.push({
      name: manifest.name,
      version: manifest.version,
      projectDirectory: manifest.projectDirectory,
      tarballPath,
      tarballName,
      sha256: await calculateFileSha256(tarballPath),
    });
  }

  await writeJsonFileAtomically(path.join(cacheDirectory, 'candidate.json'), {
    fingerprint,
    packages: packages.map((candidatePackage) => ({
      name: candidatePackage.name,
      version: candidatePackage.version,
      projectDirectory: candidatePackage.projectDirectory,
      tarballName: candidatePackage.tarballName,
      sha256: candidatePackage.sha256,
    })),
  });

  return packages;
};

const installCandidateRuntime = async (
  packages: readonly ICandidatePackage[],
  runtimeDirectory: string,
  signal: AbortSignal | undefined,
): Promise<void> => {
  await ensureDirectory(runtimeDirectory);
  const localDependencies = Object.fromEntries(
    packages.map((candidatePackage) => [
      candidatePackage.name,
      `file:${candidatePackage.tarballPath}`,
    ]),
  );
  const packageJson = {
    name: 'moldea-qualification-runtime',
    version: '0.0.0',
    private: true,
    type: 'module',
    dependencies: localDependencies,
  };

  await writeJsonFileAtomically(path.join(runtimeDirectory, 'package.json'), packageJson);
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

/** Builds, packs, verifies, caches, and installs one exact local candidate package closure. */
export const prepareCandidateClosure = async (
  options: ICandidatePreparationOptions,
): Promise<ICandidateClosure> => {
  const manifests = await discoverPackageManifests();
  const runtimeClosure = resolveRuntimeClosure(manifests, [
    '@moldea.ai/cli',
    options.adapterPackage,
  ]);
  const fingerprint = calculateSha256(
    `${options.packagesDigest}\n${runtimeClosure.map(({ name, version }) => `${name}@${version}`).join('\n')}\n`,
  );
  const cacheDirectory = path.join(LOCAL_QUALIFICATION_ROOT, 'candidates', fingerprint);
  const runtimeDirectory = path.join(options.attemptDirectory, 'runtime');
  const cachedPackages = await validateCachedCandidate(cacheDirectory, fingerprint);

  if (cachedPackages === null) {
    await rm(cacheDirectory, { force: true, recursive: true });
  }

  const packages =
    cachedPackages ??
    (await buildAndPackCandidate(
      manifests,
      runtimeClosure,
      cacheDirectory,
      fingerprint,
      options.signal,
    ));

  await installCandidateRuntime(packages, runtimeDirectory, options.signal);

  return CandidateClosureSchema.parse({
    fingerprint,
    packages,
    runtimeDirectory,
  });
};
