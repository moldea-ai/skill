import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { z } from 'zod';

import { CLI_PACKAGE_NAME, parseStableVersion } from '../release/index.ts';

import type { ICliClosureEdge, ICliClosureEdgeField, ICliClosureIdentity } from './types.ts';

const EDGE_FIELDS: ICliClosureEdgeField[] = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
];

const DependencyMapSchema = z.record(z.string(), z.string());
const PackageRecordSchema = z.object({
  dependencies: DependencyMapSchema.optional(),
  devDependencies: DependencyMapSchema.optional(),
  integrity: z.string().optional(),
  optionalDependencies: DependencyMapSchema.optional(),
  peerDependencies: DependencyMapSchema.optional(),
  peerDependenciesMeta: z
    .record(z.string(), z.object({ optional: z.boolean().optional() }))
    .optional(),
  version: z.string().optional(),
});
type IPackageRecord = z.infer<typeof PackageRecordSchema>;

const PackageManifestSchema = z.object({
  devDependencies: DependencyMapSchema,
  moldeaRelease: z.object({ cliJsonSchemaVersion: z.number() }),
});
const PackageLockSchema = z.object({
  lockfileVersion: z.number(),
  packages: z.record(z.string(), PackageRecordSchema),
});

const readJson = (repositoryRoot: string, relativePath: string): unknown =>
  JSON.parse(readFileSync(join(repositoryRoot, relativePath), 'utf8')) as unknown;

const requirePositiveInteger = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
};

const requireNonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
};

const getResolutionRoots = (packageKey: string): string[] => {
  const roots = [packageKey];
  let currentRoot = packageKey;

  while (currentRoot.includes('/node_modules/')) {
    currentRoot = currentRoot.slice(0, currentRoot.lastIndexOf('/node_modules/'));
    roots.push(currentRoot);
  }

  roots.push('');
  return [...new Set(roots)];
};

const resolveDependencyPackageKey = (
  packages: Record<string, IPackageRecord>,
  packageKey: string,
  dependencyName: string,
): string | null => {
  for (const resolutionRoot of getResolutionRoots(packageKey)) {
    const candidate = posix.join(resolutionRoot, 'node_modules', dependencyName);
    if (packages[candidate] !== undefined) return candidate;
  }

  return null;
};

const isOptionalPeer = (packageRecord: IPackageRecord, dependencyName: string): boolean =>
  packageRecord.peerDependenciesMeta?.[dependencyName]?.optional === true;

const collectPackageEdges = (
  packages: Record<string, IPackageRecord>,
  packageKey: string,
  packageRecord: IPackageRecord,
): ICliClosureEdge[] => {
  const edges: ICliClosureEdge[] = [];

  for (const field of EDGE_FIELDS) {
    const declaredEdges = packageRecord[field] ?? {};
    for (const [name, requested] of Object.entries(declaredEdges)) {
      if (requested.length === 0) {
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
export const createCliClosureIdentity = (repositoryRoot: string): ICliClosureIdentity => {
  const packageManifest = PackageManifestSchema.parse(readJson(repositoryRoot, 'package.json'));
  const packageLock = PackageLockSchema.parse(readJson(repositoryRoot, 'package-lock.json'));
  const cliDeclaration = parseStableVersion(packageManifest.devDependencies?.[CLI_PACKAGE_NAME]);
  const cliJsonSchemaVersion = requirePositiveInteger(
    packageManifest.moldeaRelease?.cliJsonSchemaVersion,
    'package.json moldeaRelease.cliJsonSchemaVersion',
  );
  const packages = packageLock.packages;
  const cliPackageKey = `node_modules/${CLI_PACKAGE_NAME}`;
  if (packageLock.lockfileVersion !== 3) {
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

  const pendingPackageKeys: string[] = [cliPackageKey];
  const visitedPackageKeys = new Set<string>();
  const closurePackages: ICliClosureIdentity['packages'] = [];

  while (pendingPackageKeys.length > 0) {
    const packageKey = pendingPackageKeys.shift();
    if (packageKey === undefined) break;
    if (visitedPackageKeys.has(packageKey)) continue;
    visitedPackageKeys.add(packageKey);

    const packageRecord = packages[packageKey];
    if (packageRecord === undefined) {
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
export const createCliClosureDigest = (repositoryRoot: string): string =>
  createHash('sha256')
    .update(`${JSON.stringify(createCliClosureIdentity(repositoryRoot))}\n`)
    .digest('hex');
