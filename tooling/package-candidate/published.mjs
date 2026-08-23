import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import semver from 'semver';

import { loadCandidateArtifacts } from './artifacts.mjs';

const CLI_PACKAGE_NAME = '@moldea.ai/cli';
const MOLDEA_PACKAGE_PREFIX = '@moldea.ai/';
const NPM_REGISTRY_ORIGIN = 'https://registry.npmjs.org';
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const SHA1_PATTERN = /^[a-f0-9]{40}$/u;

const isMoldeaPackageName = (packageName) => packageName.startsWith(MOLDEA_PACKAGE_PREFIX);

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
  assert.match(input.version, STABLE_VERSION_PATTERN);
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

const fetchRegistryResource = async (url, fetchResource) => {
  const response = await fetchResource(url, {
    headers: { accept: 'application/json' },
    redirect: 'error',
  });
  if (!response.ok) {
    throw new Error(`npm registry request failed with HTTP ${response.status}: ${url}`);
  }
  return response;
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
  version,
}) => {
  assert.equal(typeof packageName, 'string');
  assert.ok(packageName.length > 0);
  assert.match(version, STABLE_VERSION_PATTERN);
  const metadataUrl = `${NPM_REGISTRY_ORIGIN}/${encodeURIComponent(packageName)}/${version}`;
  const response = await fetchRegistryResource(metadataUrl, fetchResource);
  return parsePublishedPackage(await response.json(), packageName, version);
};

/** Resolves the exact published Moldea runtime closure rooted at one CLI release. */
export const resolvePublishedPackageClosure = async ({
  cliVersion,
  fetchResource = fetch,
  selectedPackageName,
}) => {
  assert.match(cliVersion, STABLE_VERSION_PATTERN);
  assert.ok(isMoldeaPackageName(selectedPackageName));
  const manifests = new Map();
  const rootVersions = new Map();
  const visiting = new Set();
  const ordered = [];

  const resolveVersion = (packageName, versionRange) => {
    if (packageName === CLI_PACKAGE_NAME) return versionRange;
    const rootVersion = rootVersions.get(packageName);
    assert.ok(
      rootVersion !== undefined,
      `${packageName} must be pinned exactly by ${CLI_PACKAGE_NAME}@${cliVersion}.`,
    );
    assert.ok(
      semver.satisfies(rootVersion, versionRange),
      `${packageName}@${rootVersion} does not satisfy published dependency range ${versionRange}.`,
    );
    return rootVersion;
  };

  const visitPackage = async (packageName, versionRange) => {
    const version = resolveVersion(packageName, versionRange);
    assert.match(version, STABLE_VERSION_PATTERN, `${packageName} must use an exact version.`);
    const identity = `${packageName}@${version}`;
    if (visiting.has(identity)) {
      throw new Error(`Published package dependency cycle includes ${identity}.`);
    }
    const existingManifest = manifests.get(packageName);
    if (existingManifest !== undefined) {
      if (existingManifest.version !== version) {
        throw new Error(
          `${packageName} resolves to both ${existingManifest.version} and ${version}.`,
        );
      }
      return;
    }

    visiting.add(identity);
    const manifest = await resolvePublishedPackageManifest({
      fetchResource,
      packageName,
      version,
    });
    manifests.set(packageName, manifest);

    if (packageName === CLI_PACKAGE_NAME) {
      for (const [dependencyName, dependencyVersion] of getInternalDependencies(manifest)) {
        assert.match(
          dependencyVersion,
          STABLE_VERSION_PATTERN,
          `${CLI_PACKAGE_NAME} must pin ${dependencyName} to an exact version.`,
        );
        rootVersions.set(dependencyName, dependencyVersion);
      }
    }

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

const validateArchiveIntegrity = (archive, manifest) => {
  const integrity = `sha512-${createHash('sha512').update(archive).digest('base64')}`;
  const shasum = createHash('sha1').update(archive).digest('hex');
  if (integrity !== manifest.dist.integrity || shasum !== manifest.dist.shasum) {
    throw new Error(`Registry integrity mismatch for ${manifest.name}@${manifest.version}.`);
  }
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
}) => {
  mkdirSync(artifactDirectory, { recursive: true });
  const response = await fetchRegistryResource(manifest.dist.tarball, fetchResource);
  const archive = Buffer.from(await response.arrayBuffer());
  validateArchiveIntegrity(archive, manifest);
  const tarballName = basename(new URL(manifest.dist.tarball).pathname);
  assert.ok(tarballName.endsWith('.tgz'));
  const tarballPath = join(artifactDirectory, tarballName);
  writeFileSync(tarballPath, archive, { flag: 'wx' });
  return {
    name: manifest.name,
    registryIntegrity: manifest.dist.integrity,
    registryShasum: manifest.dist.shasum,
    registryTarballUrl: manifest.dist.tarball,
    sha256: createHash('sha256').update(archive).digest('hex'),
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
}) => {
  mkdirSync(artifactDirectory, { recursive: true });
  const packages = [];

  for (const manifest of manifests) {
    packages.push(
      await downloadPublishedPackageArtifact({
        artifactDirectory,
        fetchResource,
        manifest,
      }),
    );
  }

  loadCandidateArtifacts(artifactDirectory, [selectedPackageName]);
  return packages;
};
