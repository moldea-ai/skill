import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const CANDIDATE_PACKAGE_NAMES = [
  '@moldea.ai/cli',
  '@moldea.ai/adapter-openai',
  '@moldea.ai/core',
  '@moldea.ai/repository',
  '@moldea.ai/repository-fs',
];
const CANDIDATE_PACKAGE_NAME_SET = new Set(CANDIDATE_PACKAGE_NAMES);
const INTERNAL_CLI_DEPENDENCY_NAMES = CANDIDATE_PACKAGE_NAMES.filter(
  (packageName) => packageName !== '@moldea.ai/cli',
);
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Reads one regular entry from a gzip-compressed USTAR-compatible package archive.
 * @param tarball The complete package archive bytes.
 * @param entryPath The exact archive path to read.
 * @returns The selected entry bytes.
 */
const readTarEntry = (tarball, entryPath) => {
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

/**
 * Registers one expected candidate artifact without allowing duplicate package identities.
 * @param artifacts The artifacts already keyed by package name.
 * @param artifact The candidate artifact to register.
 * @returns The updated artifact map.
 */
export const registerCandidateArtifact = (artifacts, artifact) => {
  const packageName = artifact.manifest.name;

  assert.ok(CANDIDATE_PACKAGE_NAME_SET.has(packageName), `Unexpected ${packageName} tarball.`);
  assert.equal(artifacts.has(packageName), false, `Duplicate ${packageName} tarball.`);
  artifacts.set(packageName, artifact);
  return artifacts;
};

/**
 * Validates the identities, versions, and exact internal dependencies of a candidate closure.
 * @param artifacts The artifacts keyed by package name.
 * @returns The validated artifacts and derived CLI version.
 */
export const validateCandidateArtifacts = (artifacts) => {
  assert.deepEqual([...artifacts.keys()].sort(), [...CANDIDATE_PACKAGE_NAMES].sort());

  for (const packageName of CANDIDATE_PACKAGE_NAMES) {
    const artifact = artifacts.get(packageName);
    assert.equal(artifact.manifest.name, packageName);
    assert.match(
      artifact.manifest.version,
      STABLE_VERSION_PATTERN,
      `${packageName} must use a stable semantic version.`,
    );
  }

  const cliManifest = artifacts.get('@moldea.ai/cli').manifest;

  for (const dependencyName of INTERNAL_CLI_DEPENDENCY_NAMES) {
    assert.equal(
      cliManifest.dependencies?.[dependencyName],
      artifacts.get(dependencyName).manifest.version,
      `${dependencyName} must be exact-pinned to its supplied candidate artifact.`,
    );
  }

  assert.equal(cliManifest.preferUnplugged, true);
  return { artifacts, cliVersion: cliManifest.version };
};

/**
 * Loads and validates the exact five-package CLI candidate closure.
 * @param artifactDirectory The directory containing the packed candidate artifacts.
 * @returns The validated artifacts and derived CLI version.
 */
export const loadCandidateArtifacts = (artifactDirectory) => {
  const artifacts = new Map();

  for (const archiveName of readdirSync(artifactDirectory).filter((name) => name.endsWith('.tgz'))) {
    const archive = readFileSync(join(artifactDirectory, archiveName));
    const manifest = JSON.parse(readTarEntry(archive, 'package/package.json').toString('utf8'));

    registerCandidateArtifact(artifacts, { archive, archiveName, manifest });
  }

  return validateCandidateArtifacts(artifacts);
};

/**
 * Builds registry metadata for one exact candidate artifact.
 * @param artifact The candidate archive and packed manifest.
 * @param registryUrl The loopback registry origin.
 * @returns The package metadata and tarball path.
 */
export const createCandidatePackageMetadata = (artifact, registryUrl) => {
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
 * Serves actual candidate manifests and tarballs through a loopback scoped registry.
 * @param artifacts The validated candidate artifacts keyed by package name.
 * @returns A promise resolving to the loopback registry URL and server.
 */
export const createCandidateRegistry = async (artifacts) => {
  let registryUrl;
  const archivePaths = new Map();
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, registryUrl).pathname);
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

  await new Promise((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  registryUrl = `http://127.0.0.1:${address.port}`;
  return { registryUrl, server };
};
