import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';

import { CLI_PACKAGE_NAME } from '../release-identity/constants.mjs';
import { parseStableVersion } from '../release-identity/identity.mjs';

const EDGE_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

const isPlainRecord = (input) =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const readJson = (repositoryRoot, relativePath) =>
  JSON.parse(readFileSync(join(repositoryRoot, relativePath), 'utf8'));

const requirePositiveInteger = (value, label) => {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
};

const requireNonEmptyString = (value, label) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
};

const getResolutionRoots = (packageKey) => {
  const roots = [packageKey];
  let currentRoot = packageKey;

  while (currentRoot.includes('/node_modules/')) {
    currentRoot = currentRoot.slice(0, currentRoot.lastIndexOf('/node_modules/'));
    roots.push(currentRoot);
  }

  roots.push('');
  return [...new Set(roots)];
};

const resolveDependencyPackageKey = (packages, packageKey, dependencyName) => {
  for (const resolutionRoot of getResolutionRoots(packageKey)) {
    const candidate = posix.join(resolutionRoot, 'node_modules', dependencyName);
    if (packages[candidate] !== undefined) return candidate;
  }

  return null;
};

const isOptionalPeer = (packageRecord, dependencyName) =>
  packageRecord.peerDependenciesMeta?.[dependencyName]?.optional === true;

const collectPackageEdges = (packages, packageKey, packageRecord) => {
  const edges = [];

  for (const field of EDGE_FIELDS) {
    const declaredEdges = packageRecord[field] ?? {};
    if (!isPlainRecord(declaredEdges)) {
      throw new Error(`${packageKey} ${field} must be an object.`);
    }
    for (const [name, requested] of Object.entries(declaredEdges)) {
      if (typeof requested !== 'string' || requested.length === 0) {
        throw new Error(`${packageKey} ${field}.${name} must be a non-empty string.`);
      }

      const resolvedPackageKey = resolveDependencyPackageKey(packages, packageKey, name);
      const isOptional = field === 'optionalDependencies' || isOptionalPeer(packageRecord, name);
      if (resolvedPackageKey === null && !isOptional) {
        throw new Error(`${packageKey} cannot resolve required dependency ${name}.`);
      }

      edges.push({
        field,
        name,
        requested,
        resolvedPackageKey,
      });
    }
  }

  return edges.sort(
    (left, right) =>
      left.field.localeCompare(right.field, 'en') || left.name.localeCompare(right.name, 'en'),
  );
};

/** Returns the exact installed CLI package closure represented by the root npm lockfile. */
export const createCliClosureIdentity = (repositoryRoot) => {
  const packageManifest = readJson(repositoryRoot, 'package.json');
  const packageLock = readJson(repositoryRoot, 'package-lock.json');
  const cliDeclaration = parseStableVersion(packageManifest.devDependencies?.[CLI_PACKAGE_NAME]);
  const cliJsonSchemaVersion = requirePositiveInteger(
    packageManifest.moldeaRelease?.cliJsonSchemaVersion,
    'package.json moldeaRelease.cliJsonSchemaVersion',
  );
  const packages = packageLock.packages;
  const cliPackageKey = `node_modules/${CLI_PACKAGE_NAME}`;
  if (packageLock.lockfileVersion !== 3 || !isPlainRecord(packages)) {
    throw new Error('package-lock.json must use npm lockfile version 3 with a packages map.');
  }
  if (packages[cliPackageKey]?.version !== cliDeclaration) {
    throw new Error(`package-lock.json does not resolve ${CLI_PACKAGE_NAME}@${cliDeclaration}.`);
  }
  if (packages['']?.devDependencies?.[CLI_PACKAGE_NAME] !== cliDeclaration) {
    throw new Error(
      `package-lock.json root does not declare ${CLI_PACKAGE_NAME}@${cliDeclaration}.`,
    );
  }

  const pendingPackageKeys = [cliPackageKey];
  const visitedPackageKeys = new Set();
  const closurePackages = [];

  while (pendingPackageKeys.length > 0) {
    const packageKey = pendingPackageKeys.shift();
    if (visitedPackageKeys.has(packageKey)) continue;
    visitedPackageKeys.add(packageKey);

    const packageRecord = packages[packageKey];
    if (!isPlainRecord(packageRecord)) {
      throw new Error(`CLI closure package ${packageKey} is missing.`);
    }
    const version = requireNonEmptyString(packageRecord.version, `${packageKey} version`);
    if (typeof packageRecord.integrity !== 'string' || packageRecord.integrity.length === 0) {
      throw new Error(`CLI closure package ${packageKey} is missing registry integrity.`);
    }

    const edges = collectPackageEdges(packages, packageKey, packageRecord);
    for (const edge of edges) {
      if (edge.resolvedPackageKey !== null) pendingPackageKeys.push(edge.resolvedPackageKey);
    }
    pendingPackageKeys.sort((left, right) => left.localeCompare(right, 'en'));
    closurePackages.push({
      edges,
      integrity: packageRecord.integrity,
      packageKey,
      version,
    });
  }

  closurePackages.sort((left, right) => left.packageKey.localeCompare(right.packageKey, 'en'));
  return {
    cliDeclaration,
    cliJsonSchemaVersion,
    packages: closurePackages,
    schemaVersion: 1,
  };
};

/** Hashes the exact CLI declaration, schema version, package identities, and dependency edges. */
export const createCliClosureDigest = (repositoryRoot) =>
  createHash('sha256')
    .update(`${JSON.stringify(createCliClosureIdentity(repositoryRoot))}\n`)
    .digest('hex');
