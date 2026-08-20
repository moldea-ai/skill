import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';

import {
  createSourceCandidatePlan,
  loadCandidateArtifacts,
  type ISourcePackageManifest,
} from '../../../tooling/package-candidate/index.mjs';

import { LOCAL_QUALIFICATION_ROOT } from '../constants/index.ts';
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
import type { ICandidatePreparationOptions } from './types.ts';

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

const createCandidateFingerprint = (
  packagesDigest: string,
  runtimeClosure: readonly ISourcePackageManifest[],
): string =>
  calculateSha256(
    `${packagesDigest}\n${runtimeClosure
      .map(({ name, version }) => `${name}@${version}`)
      .join('\n')}\n`,
  );

const validateCachedCandidate = async (options: {
  adapterPackage: string;
  cacheDirectory: string;
  expectedFingerprint: string;
  runtimeClosure: readonly ISourcePackageManifest[];
}): Promise<ICandidatePackage[] | null> => {
  try {
    const cachedManifest = await readJsonFile(
      path.join(options.cacheDirectory, 'candidate.json'),
      CachedCandidateManifestSchema,
    );

    if (cachedManifest.fingerprint !== options.expectedFingerprint) {
      return null;
    }

    const expectedPackages = options.runtimeClosure.map(({ name, projectDirectory, version }) => ({
      name,
      projectDirectory,
      version,
    }));
    const cachedPackages = cachedManifest.packages.map(({ name, projectDirectory, version }) => ({
      name,
      projectDirectory,
      version,
    }));

    if (JSON.stringify(cachedPackages) !== JSON.stringify(expectedPackages)) {
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

    return packages;
  } catch {
    return null;
  }
};

const buildAndPackCandidate = async (options: {
  adapterPackage: string;
  buildClosure: readonly ISourcePackageManifest[];
  cacheDirectory: string;
  fingerprint: string;
  packagesRepository: string;
  runtimeClosure: readonly ISourcePackageManifest[];
  signal: AbortSignal | undefined;
}): Promise<ICandidatePackage[]> => {
  for (const manifest of options.buildClosure) {
    await executeProcess({
      command: 'pnpm',
      args: ['--filter', manifest.name, 'build'],
      cwd: options.packagesRepository,
      signal: options.signal,
    });
  }

  await ensureDirectory(options.cacheDirectory);

  for (const manifest of options.runtimeClosure) {
    const existingTarballs = new Set(
      (await readdir(options.cacheDirectory)).filter((fileName) => fileName.endsWith('.tgz')),
    );
    await executeProcess({
      command: 'pnpm',
      args: ['pack', '--pack-destination', options.cacheDirectory],
      cwd: path.join(options.packagesRepository, manifest.projectDirectory),
      signal: options.signal,
    });
    const newTarballs = (await readdir(options.cacheDirectory)).filter(
      (fileName) => fileName.endsWith('.tgz') && !existingTarballs.has(fileName),
    );

    if (newTarballs.length !== 1) {
      throw new Error(`Packing ${manifest.name} did not create exactly one candidate tarball.`);
    }
  }

  const candidate = loadCandidateArtifacts(options.cacheDirectory, [options.adapterPackage]);
  const packages = await Promise.all(
    options.runtimeClosure.map(async (manifest): Promise<ICandidatePackage> => {
      const artifact = candidate.artifacts.get(manifest.name);

      if (artifact === undefined || artifact.manifest.version !== manifest.version) {
        throw new Error(`Packed artifact identity does not match ${manifest.name}.`);
      }

      const tarballPath = path.join(options.cacheDirectory, artifact.archiveName);
      return {
        name: manifest.name,
        version: manifest.version,
        projectDirectory: manifest.projectDirectory,
        tarballPath,
        tarballName: artifact.archiveName,
        sha256: await calculateFileSha256(tarballPath),
      };
    }),
  );

  await writeJsonFileAtomically(path.join(options.cacheDirectory, 'candidate.json'), {
    fingerprint: options.fingerprint,
    packages: packages.map(({ name, projectDirectory, sha256, tarballName, version }) => ({
      name,
      projectDirectory,
      sha256,
      tarballName,
      version,
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

/** Builds, validates, caches, and installs one exact local candidate package closure. */
export const prepareCandidateClosure = async (
  options: ICandidatePreparationOptions,
): Promise<ICandidateClosure> => {
  const { buildClosure, runtimeClosure } = createSourceCandidatePlan(options.packagesRepository, [
    options.adapterPackage,
  ]);
  const fingerprint = createCandidateFingerprint(options.packagesDigest, runtimeClosure);
  const cacheDirectory = path.join(LOCAL_QUALIFICATION_ROOT, 'candidates', fingerprint);
  const runtimeDirectory = path.join(options.attemptDirectory, 'runtime');
  const cachedPackages = await validateCachedCandidate({
    adapterPackage: options.adapterPackage,
    cacheDirectory,
    expectedFingerprint: fingerprint,
    runtimeClosure,
  });

  if (cachedPackages === null) {
    await rm(cacheDirectory, { force: true, recursive: true });
  }

  const packages =
    cachedPackages ??
    (await buildAndPackCandidate({
      adapterPackage: options.adapterPackage,
      buildClosure,
      cacheDirectory,
      fingerprint,
      packagesRepository: options.packagesRepository,
      runtimeClosure,
      signal: options.signal,
    }));

  await installCandidateRuntime(packages, runtimeDirectory, options.signal);

  return CandidateClosureSchema.parse({ fingerprint, packages, runtimeDirectory });
};
