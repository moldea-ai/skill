import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import semver from 'semver';

import { loadCandidateArtifacts } from './artifacts.mjs';

const CLI_PACKAGE_NAME = '@moldea.ai/cli';
const ADAPTER_PACKAGE_PREFIX = '@moldea.ai/adapter-';
const MOLDEA_PACKAGE_PREFIX = '@moldea.ai/';
const NPM_REGISTRY_ORIGIN = 'https://registry.npmjs.org';
const NPM_REGISTRY_REQUEST_TIMEOUT_MS = 300_000;
const MAXIMUM_NPM_REGISTRY_RESPONSE_BYTES = 16 * 1024 * 1024;
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const COMPATIBLE_MAJOR_RANGE_PATTERN = /^\^[1-9]\d*\.0\.0$/u;
const SHA1_PATTERN = /^[a-f0-9]{40}$/u;

const isMoldeaPackageName = (packageName) => packageName.startsWith(MOLDEA_PACKAGE_PREFIX);

/** Asserts one canonical exact semantic version, including prerelease and build identifiers. */
const assertExactSemver = (version) => {
  const parsedVersion = semver.parse(version);
  assert.ok(
    parsedVersion !== null && !version.startsWith('v') && parsedVersion.raw === version,
    `${version} must be an exact semantic version.`,
  );
};

const readStringRecord = (input, fieldName, packageName) => {
  if (input === undefined) return {};
  assert.ok(
    input !== null && typeof input === 'object' && !Array.isArray(input),
    `${packageName} ${fieldName} must be an object.`,
  );
  for (const [dependencyName, dependencyVersion] of Object.entries(input)) {
    assert.equal(
      typeof dependencyVersion,
      'string',
      `${packageName} ${dependencyName} must use a string version.`,
    );
  }
  return input;
};

const parsePublishedPackage = (input, expectedName, expectedVersion) => {
  assert.ok(input !== null && typeof input === 'object' && !Array.isArray(input));
  assert.equal(input.name, expectedName);
  assert.equal(input.version, expectedVersion);
  assertExactSemver(input.version);
  assert.ok(input.dist !== null && typeof input.dist === 'object' && !Array.isArray(input.dist));
  assert.equal(typeof input.dist.integrity, 'string');
  assert.ok(input.dist.integrity.startsWith('sha512-'));
  assert.match(input.dist.shasum, SHA1_PATTERN);
  const tarballUrl = new URL(input.dist.tarball);
  assert.equal(tarballUrl.protocol, 'https:');
  assert.equal(tarballUrl.origin, NPM_REGISTRY_ORIGIN);

  return {
    dependencies: readStringRecord(input.dependencies, 'dependencies', expectedName),
    dist: {
      integrity: input.dist.integrity,
      shasum: input.dist.shasum,
      tarball: tarballUrl.href,
    },
    name: input.name,
    optionalDependencies: readStringRecord(
      input.optionalDependencies,
      'optionalDependencies',
      expectedName,
    ),
    preferUnplugged: input.preferUnplugged,
    version: input.version,
  };
};

/** Fetches one cancellable npm registry resource into a bounded buffer. */
const fetchRegistryResource = async (url, fetchResource, signal) => {
  const requestController = new AbortController();
  const timeoutError = new Error(
    `npm registry request exceeded ${NPM_REGISTRY_REQUEST_TIMEOUT_MS} milliseconds: ${url}`,
  );
  const abortFromCaller = () => requestController.abort(signal?.reason);
  const timeout = setTimeout(
    () => requestController.abort(timeoutError),
    NPM_REGISTRY_REQUEST_TIMEOUT_MS,
  );
  timeout.unref?.();

  if (signal?.aborted === true) {
    abortFromCaller();
  } else {
    signal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const response = await fetchResource(url, {
      headers: { accept: 'application/json' },
      redirect: 'error',
      signal: requestController.signal,
    });
    if (!response.ok) {
      throw new Error(`npm registry request failed with HTTP ${response.status}: ${url}`);
    }

    const contentLength = response.headers.get('content-length');
    if (
      contentLength !== null &&
      /^\d+$/u.test(contentLength) &&
      Number(contentLength) > MAXIMUM_NPM_REGISTRY_RESPONSE_BYTES
    ) {
      try {
        await response.body?.cancel();
      } catch {
        // the bounded response failure remains the actionable error
      }
      throw new Error(
        `npm registry response exceeded ${MAXIMUM_NPM_REGISTRY_RESPONSE_BYTES} bytes: ${url}`,
      );
    }
    if (response.body === null) return Buffer.alloc(0);

    const chunks = [];
    const reader = response.body.getReader();
    let responseBytes = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        responseBytes += value.byteLength;
        if (responseBytes > MAXIMUM_NPM_REGISTRY_RESPONSE_BYTES) {
          try {
            await reader.cancel();
          } catch {
            // the bounded response failure remains the actionable error
          }
          throw new Error(
            `npm registry response exceeded ${MAXIMUM_NPM_REGISTRY_RESPONSE_BYTES} bytes: ${url}`,
          );
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }

    return Buffer.concat(chunks, responseBytes);
  } catch (error) {
    if (requestController.signal.reason === timeoutError) throw timeoutError;
    if (signal?.aborted === true) {
      throw signal.reason instanceof Error
        ? signal.reason
        : new Error('npm registry request was aborted.', {
            cause: signal.reason,
          });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
};

const getInternalDependencies = (manifest) =>
  Object.entries({ ...manifest.dependencies, ...manifest.optionalDependencies })
    .filter(([packageName]) => isMoldeaPackageName(packageName))
    .sort(([left], [right]) => left.localeCompare(right, 'en'));

/**
 * Resolves one exact published package manifest from the canonical npm registry.
 * @returns A promise resolving to the validated package manifest.
 * @throws If the identity or registry response is invalid.
 */
export const resolvePublishedPackageManifest = async ({
  fetchResource = fetch,
  packageName,
  signal,
  version,
}) => {
  assert.equal(typeof packageName, 'string');
  assert.ok(packageName.length > 0);
  assertExactSemver(version);
  const metadataUrl = `${NPM_REGISTRY_ORIGIN}/${encodeURIComponent(packageName)}/${version}`;
  const response = await fetchRegistryResource(metadataUrl, fetchResource, signal);
  return parsePublishedPackage(JSON.parse(response.toString('utf8')), packageName, version);
};

/** Resolves the newest stable release satisfying one canonical compatible-major range. */
const resolvePublishedPackageVersion = async ({
  fetchResource,
  packageName,
  signal,
  versionRange,
}) => {
  assert.match(
    versionRange,
    COMPATIBLE_MAJOR_RANGE_PATTERN,
    `${packageName} must use a compatible-major dependency range.`,
  );
  const metadataUrl = `${NPM_REGISTRY_ORIGIN}/${encodeURIComponent(packageName)}`;
  const response = await fetchRegistryResource(metadataUrl, fetchResource, signal);
  const packument = JSON.parse(response.toString('utf8'));
  assert.ok(packument !== null && typeof packument === 'object' && !Array.isArray(packument));
  assert.equal(packument.name, packageName);
  assert.ok(
    packument.versions !== null &&
      typeof packument.versions === 'object' &&
      !Array.isArray(packument.versions),
    `${packageName} registry metadata must contain versions.`,
  );
  const version = semver.maxSatisfying(
    Object.keys(packument.versions).filter(
      (candidateVersion) =>
        STABLE_VERSION_PATTERN.test(candidateVersion) &&
        semver.prerelease(candidateVersion) === null,
    ),
    versionRange,
  );
  assert.ok(version !== null, `${packageName} has no stable release satisfying ${versionRange}.`);
  return version;
};

/** Resolves the exact published moldea runtime closure rooted at one CLI release. */
export const resolvePublishedPackageClosure = async ({
  cliVersion,
  fetchResource = fetch,
  selectedPackageName,
  signal,
}) => {
  assert.match(cliVersion, STABLE_VERSION_PATTERN);
  assert.ok(isMoldeaPackageName(selectedPackageName));
  const manifests = new Map();
  const visiting = new Set();
  const ordered = [];

  const visitPackage = async (packageName, versionRange) => {
    const existingManifest = manifests.get(packageName);
    if (existingManifest !== undefined) {
      const existingIdentity = `${packageName}@${existingManifest.version}`;
      if (visiting.has(existingIdentity)) {
        throw new Error(`Published package dependency cycle includes ${existingIdentity}.`);
      }
      assert.ok(
        semver.satisfies(existingManifest.version, versionRange),
        `${packageName}@${existingManifest.version} does not satisfy published dependency range ${versionRange}.`,
      );
      return;
    }
    const version =
      packageName === CLI_PACKAGE_NAME
        ? versionRange
        : await resolvePublishedPackageVersion({
            fetchResource,
            packageName,
            signal,
            versionRange,
          });
    assert.match(version, STABLE_VERSION_PATTERN, `${packageName} must resolve exactly.`);
    const identity = `${packageName}@${version}`;
    if (visiting.has(identity)) {
      throw new Error(`Published package dependency cycle includes ${identity}.`);
    }

    visiting.add(identity);
    const manifest = await resolvePublishedPackageManifest({
      fetchResource,
      packageName,
      signal,
      version,
    });
    manifests.set(packageName, manifest);

    for (const [dependencyName, dependencyVersionRange] of getInternalDependencies(manifest)) {
      await visitPackage(dependencyName, dependencyVersionRange);
    }
    visiting.delete(identity);
    ordered.push(manifest);
  };

  await visitPackage(CLI_PACKAGE_NAME, cliVersion);
  if (!manifests.has(selectedPackageName)) {
    throw new Error(
      `${selectedPackageName} is not reachable from ${CLI_PACKAGE_NAME}@${cliVersion}.`,
    );
  }

  return ordered;
};

/**
 * Selects the CLI, shared runtime packages, and one adapter's dependency closure.
 * @param manifests The complete dependency-first closure resolved from the CLI.
 * @param selectedPackageName The adapter or built-in package under qualification.
 * @returns The dependency-first package manifests relevant to the selected qualification.
 * @throws If the closure contains duplicate or missing package identities.
 */
export const selectPublishedPackageClosure = (manifests, selectedPackageName) => {
  assert.ok(isMoldeaPackageName(selectedPackageName));
  const manifestsByName = new Map();

  for (const manifest of manifests) {
    assert.equal(
      manifestsByName.has(manifest.name),
      false,
      `Published package closure contains duplicate ${manifest.name}.`,
    );
    manifestsByName.set(manifest.name, manifest);
  }

  const cliManifest = manifestsByName.get(CLI_PACKAGE_NAME);
  assert.ok(cliManifest !== undefined, `Published package closure is missing ${CLI_PACKAGE_NAME}.`);
  assert.ok(
    manifestsByName.has(selectedPackageName),
    `Published package closure is missing ${selectedPackageName}.`,
  );

  const selectedPackageNames = new Set([CLI_PACKAGE_NAME, selectedPackageName]);
  const pendingPackageNames = [CLI_PACKAGE_NAME, selectedPackageName];

  while (pendingPackageNames.length > 0) {
    const packageName = pendingPackageNames.shift();
    const manifest = manifestsByName.get(packageName);
    assert.ok(manifest !== undefined, `Published package closure is missing ${packageName}.`);

    for (const [dependencyName] of getInternalDependencies(manifest)) {
      const isUnselectedCliAdapter =
        packageName === CLI_PACKAGE_NAME &&
        selectedPackageName !== CLI_PACKAGE_NAME &&
        dependencyName.startsWith(ADAPTER_PACKAGE_PREFIX) &&
        dependencyName !== selectedPackageName;
      if (isUnselectedCliAdapter || selectedPackageNames.has(dependencyName)) continue;

      assert.ok(
        manifestsByName.has(dependencyName),
        `Published package closure is missing ${dependencyName}.`,
      );
      selectedPackageNames.add(dependencyName);
      pendingPackageNames.push(dependencyName);
    }
  }

  return manifests.filter(({ name }) => selectedPackageNames.has(name));
};

/**
 * Verifies one archive against its canonical registry identity.
 * @returns The derived local filename and SHA-256 digest.
 * @throws
 * - If the archive bytes or registry tarball filename are invalid
 */
export const verifyPublishedPackageArchive = ({ archive, manifest }) => {
  const integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`;
  const shasum = createHash('sha1').update(archive).digest('hex');
  if (integrity !== manifest.dist.integrity || shasum !== manifest.dist.shasum) {
    throw new Error(`Registry integrity mismatch for ${manifest.name}@${manifest.version}.`);
  }

  const tarballName = basename(new URL(manifest.dist.tarball).pathname);
  assert.ok(tarballName.endsWith('.tgz'));

  return {
    sha256: createHash('sha256').update(archive).digest('hex'),
    tarballName,
  };
};

/**
 * Downloads and verifies one exact published package artifact.
 * @returns A promise resolving to the verified local artifact identity.
 * @throws If the registry request, integrity, or destination is invalid.
 */
export const downloadPublishedPackageArtifact = async ({
  artifactDirectory,
  fetchResource = fetch,
  manifest,
  signal,
}) => {
  mkdirSync(artifactDirectory, { recursive: true });
  const archive = await fetchRegistryResource(manifest.dist.tarball, fetchResource, signal);
  const { sha256, tarballName } = verifyPublishedPackageArchive({
    archive,
    manifest,
  });
  const tarballPath = join(artifactDirectory, tarballName);
  writeFileSync(tarballPath, archive, { flag: 'wx' });
  return {
    name: manifest.name,
    registryIntegrity: manifest.dist.integrity,
    registryShasum: manifest.dist.shasum,
    registryTarballUrl: manifest.dist.tarball,
    sha256,
    tarballName,
    tarballPath,
    version: manifest.version,
  };
};

/** Downloads, verifies, and writes one exact published closure as reusable tarballs. */
export const downloadPublishedPackageClosure = async ({
  artifactDirectory,
  fetchResource = fetch,
  manifests,
  selectedPackageName,
  signal,
}) => {
  mkdirSync(artifactDirectory, { recursive: true });
  const packages = [];

  for (const manifest of manifests) {
    packages.push(
      await downloadPublishedPackageArtifact({
        artifactDirectory,
        fetchResource,
        manifest,
        signal,
      }),
    );
  }

  loadCandidateArtifacts(artifactDirectory, [selectedPackageName]);
  return packages;
};
