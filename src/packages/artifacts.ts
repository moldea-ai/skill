import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import semver from 'semver';

import type {
  ICandidateRegistry,
  IPackageCandidateArtifact,
  IPackageCandidateManifest,
  IValidatedPackageCandidate,
} from './types.ts';

const CLI_PACKAGE_NAME = '@moldea.ai/cli';
const MOLDEA_PACKAGE_PREFIX = '@moldea.ai/';
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const COMPATIBLE_MAJOR_RANGE_PATTERN = /^\^[1-9]\d*\.0\.0$/u;

type ICandidatePackageVersionMetadata = IPackageCandidateManifest & {
  dist: {
    integrity: string;
    shasum: string;
    tarball: string;
  };
};

type ICandidatePackageMetadata = {
  'dist-tags': { latest: string };
  name: string;
  time: Record<string, string>;
  versions: Record<string, ICandidatePackageVersionMetadata>;
};

/** Returns whether a package belongs to the local moldea package namespace. */
const isMoldeaPackageName = (packageName: string): boolean =>
  packageName.startsWith(MOLDEA_PACKAGE_PREFIX);

/** Reads one regular entry from a gzip-compressed USTAR-compatible package archive. */
const readTarEntry = (tarball: Buffer, entryPath: string): Buffer => {
  const archive = gunzipSync(tarball);
  let offset = 0;

  while (offset + 512 <= archive.byteLength) {
    const header = archive.subarray(offset, offset + 512);
    const nameEnd = header.indexOf(0);

    if (nameEnd === 0) break;

    const name = header.subarray(0, nameEnd).toString('utf8');
    const sizeText = header.subarray(124, 136).toString('ascii').replaceAll('\0', '').trim();
    const size = Number.parseInt(sizeText, 8);
    assert.ok(Number.isSafeInteger(size) && size >= 0, `Invalid tar entry size for ${name}.`);
    const contentOffset = offset + 512;

    if (name === entryPath) {
      return archive.subarray(contentOffset, contentOffset + size);
    }

    offset = contentOffset + Math.ceil(size / 512) * 512;
  }

  throw new Error(`The candidate archive is missing ${entryPath}.`);
};

/** Returns local runtime dependencies declared by one packed package. */
const getInternalRuntimeDependencies = (
  manifest: IPackageCandidateManifest,
): Array<[string, string]> =>
  Object.entries({
    ...(manifest.dependencies ?? {}),
    ...(manifest.optionalDependencies ?? {}),
  })
    .filter(([packageName]) => isMoldeaPackageName(packageName))
    .sort(([left], [right]) => left.localeCompare(right, 'en'));

/** Validates one compatible-major dependency against its candidate artifact. */
const validateInternalDependencyVersion = ({
  dependencyArtifact,
  dependencyName,
  dependencyVersion,
  manifest,
}: {
  dependencyArtifact: IPackageCandidateArtifact;
  dependencyName: string;
  dependencyVersion: string;
  manifest: IPackageCandidateManifest;
}): void => {
  if (!COMPATIBLE_MAJOR_RANGE_PATTERN.test(dependencyVersion)) {
    throw new Error(
      `${manifest.name} must declare ${dependencyName} with a compatible-major range.`,
    );
  }
  assert.ok(
    semver.satisfies(dependencyArtifact.manifest.version, dependencyVersion),
    `${dependencyName}@${dependencyArtifact.manifest.version} does not satisfy ${dependencyVersion}.`,
  );
};

/**
 * Registers one candidate artifact without allowing duplicate identities.
 * @param artifacts The artifacts already keyed by package name.
 * @param artifact The candidate artifact to register.
 * @returns The updated artifact map.
 */
export const registerCandidateArtifact = (
  artifacts: Map<string, IPackageCandidateArtifact>,
  artifact: IPackageCandidateArtifact,
): Map<string, IPackageCandidateArtifact> => {
  const packageName = artifact.manifest.name;

  assert.equal(typeof packageName, 'string', 'Candidate package names must be strings.');
  assert.ok(isMoldeaPackageName(packageName), `Unexpected ${packageName} tarball.`);
  assert.equal(artifacts.has(packageName), false, `Duplicate ${packageName} tarball.`);
  artifacts.set(packageName, artifact);
  return artifacts;
};

/**
 * Validates the exact reachable candidate graph rooted at the CLI and selected packages.
 * @param artifacts The artifacts keyed by package name.
 * @param selectedRootPackageNames Additional package roots required by the consumer.
 * @returns The validated artifacts and derived CLI version.
 */
export const validateCandidateArtifacts = (
  artifacts: Map<string, IPackageCandidateArtifact>,
  selectedRootPackageNames: string[] = [],
): IValidatedPackageCandidate => {
  const rootPackageNames = [CLI_PACKAGE_NAME, ...selectedRootPackageNames];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visitPackage = (packageName: string): void => {
    if (visited.has(packageName)) return;
    if (visiting.has(packageName)) {
      throw new Error(`Candidate package dependency cycle includes ${packageName}.`);
    }

    const artifact = artifacts.get(packageName);
    if (!artifact) {
      throw new Error(`Candidate closure requires missing package ${packageName}.`);
    }
    assert.equal(artifact.manifest.name, packageName);
    assert.match(
      artifact.manifest.version,
      STABLE_VERSION_PATTERN,
      `${packageName} must use a stable semantic version.`,
    );

    visiting.add(packageName);
    for (const [dependencyName, dependencyVersion] of getInternalRuntimeDependencies(
      artifact.manifest,
    )) {
      const dependencyArtifact = artifacts.get(dependencyName);
      if (!dependencyArtifact) {
        throw new Error(`Candidate closure requires missing package ${dependencyName}.`);
      }
      validateInternalDependencyVersion({
        dependencyArtifact,
        dependencyName,
        dependencyVersion,
        manifest: artifact.manifest,
      });
      visitPackage(dependencyName);
    }
    visiting.delete(packageName);
    visited.add(packageName);
  };

  for (const rootPackageName of [...new Set(rootPackageNames)].sort((left, right) =>
    left.localeCompare(right, 'en'),
  )) {
    visitPackage(rootPackageName);
  }

  const unreachablePackageNames = [...artifacts.keys()]
    .filter((packageName) => !visited.has(packageName))
    .sort((left, right) => left.localeCompare(right, 'en'));
  if (unreachablePackageNames.length > 0) {
    throw new Error(`Unreachable candidate artifacts: ${unreachablePackageNames.join(', ')}.`);
  }

  const cliManifest = artifacts.get(CLI_PACKAGE_NAME)?.manifest;
  assert.ok(cliManifest !== undefined);
  assert.equal(cliManifest.preferUnplugged, true);
  return { artifacts, cliVersion: cliManifest.version };
};

/**
 * Loads and validates one dynamic package candidate closure.
 * @param artifactDirectory The directory containing packed candidate artifacts.
 * @param selectedRootPackageNames Additional package roots required by the consumer.
 * @returns The validated artifacts and derived CLI version.
 */
export const loadCandidateArtifacts = (
  artifactDirectory: string,
  selectedRootPackageNames: string[] = [],
): IValidatedPackageCandidate => {
  const artifacts = new Map<string, IPackageCandidateArtifact>();

  for (const archiveName of readdirSync(artifactDirectory)
    .filter((name) => name.endsWith('.tgz'))
    .sort((left, right) => left.localeCompare(right, 'en'))) {
    const archive = readFileSync(join(artifactDirectory, archiveName));
    const manifest = JSON.parse(
      readTarEntry(archive, 'package/package.json').toString('utf8'),
    ) as IPackageCandidateManifest;

    registerCandidateArtifact(artifacts, { archive, archiveName, manifest });
  }

  return validateCandidateArtifacts(artifacts, selectedRootPackageNames);
};

/**
 * Builds registry metadata for one exact candidate artifact.
 * @param artifact The candidate archive and packed manifest.
 * @param registryUrl The loopback registry origin.
 * @returns The package metadata and tarball path.
 */
export const createCandidatePackageMetadata = (
  artifact: IPackageCandidateArtifact,
  registryUrl: string,
): {
  archivePath: string;
  metadata: ICandidatePackageMetadata;
} => {
  const { archive, archiveName, manifest } = artifact;
  const archivePath = `/${manifest.name}/-/${basename(archiveName)}`;
  const publishedAt = '2025-01-01T00:00:00.000Z';

  return {
    archivePath,
    metadata: {
      name: manifest.name,
      'dist-tags': { latest: manifest.version },
      // fixed past timestamps remain valid across Yarn metadata-age policies
      time: {
        created: publishedAt,
        modified: publishedAt,
        [manifest.version]: publishedAt,
      },
      versions: {
        [manifest.version]: {
          ...manifest,
          dist: {
            integrity: `sha512-${createHash('sha512').update(archive).digest('base64')}`,
            shasum: createHash('sha1').update(archive).digest('hex'),
            tarball: `${registryUrl}${archivePath}`,
          },
        },
      },
    },
  };
};

/**
 * Serves candidate manifests and tarballs through a loopback scoped registry.
 * @param artifacts The validated artifacts keyed by package name.
 * @returns A promise resolving to the loopback registry URL and server.
 */
export const createCandidateRegistry = async (
  artifacts: Map<string, IPackageCandidateArtifact>,
): Promise<ICandidateRegistry> => {
  let registryUrl = 'http://127.0.0.1';
  const archivePaths = new Map<string, Buffer>();
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', registryUrl).pathname);
    const archive = archivePaths.get(pathname);

    if (archive !== undefined) {
      response.writeHead(200, { 'content-type': 'application/octet-stream' });
      response.end(archive);
      return;
    }

    const packageName = pathname.slice(1);
    const artifact = artifacts.get(packageName);

    if (artifact !== undefined) {
      const { archivePath, metadata } = createCandidatePackageMetadata(artifact, registryUrl);
      archivePaths.set(archivePath, artifact.archive);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(metadata));
      return;
    }

    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  registryUrl = `http://127.0.0.1:${address.port}`;
  return { registryUrl, server };
};
