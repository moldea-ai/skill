import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  parseRuntimeCompatibilityPublication,
  RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME,
} from '../runtime-compatibility-publication/index.mjs';

import { loadCandidateArtifacts } from './artifacts.mjs';

const CLI_PACKAGE_NAME = '@moldea.ai/cli';
const MOLDEA_PACKAGE_PREFIX = '@moldea.ai/';
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const WORKSPACE_COLLECTION_NAMES = ['packages', 'projects'];

/** Returns whether a package belongs to the local Moldea package namespace. */
const isMoldeaPackageName = (packageName) => packageName.startsWith(MOLDEA_PACKAGE_PREFIX);

/** Returns one validated dependency record from an unknown manifest field. */
const readDependencyRecord = (dependencies, fieldName, packageName) => {
  if (dependencies === undefined) return {};
  assert.ok(
    dependencies && typeof dependencies === 'object' && !Array.isArray(dependencies),
    `${packageName} ${fieldName} must be an object.`,
  );
  for (const [dependencyName, dependencyVersion] of Object.entries(dependencies)) {
    assert.equal(
      typeof dependencyVersion,
      'string',
      `${dependencyName} must use a string version.`,
    );
  }
  return dependencies;
};

/** Reads and validates the package fields required by source candidate construction. */
const readSourcePackageManifest = (manifestPath, projectDirectory) => {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(typeof manifest.name, 'string', `${manifestPath} must declare a package name.`);
  assert.ok(isMoldeaPackageName(manifest.name), `${manifest.name} is outside the Moldea scope.`);
  assert.match(
    manifest.version,
    STABLE_VERSION_PATTERN,
    `${manifest.name} must use a stable semantic version.`,
  );

  return {
    dependencies: readDependencyRecord(manifest.dependencies, 'dependencies', manifest.name),
    devDependencies: readDependencyRecord(
      manifest.devDependencies,
      'devDependencies',
      manifest.name,
    ),
    name: manifest.name,
    optionalDependencies: readDependencyRecord(
      manifest.optionalDependencies,
      'optionalDependencies',
      manifest.name,
    ),
    projectDirectory,
    version: manifest.version,
  };
};

/** Returns local dependency entries in deterministic name order. */
const getLocalDependencies = (manifest, fields) =>
  fields
    .flatMap((fieldName) => Object.entries(manifest[fieldName]))
    .filter(([packageName]) => isMoldeaPackageName(packageName))
    .sort(([left], [right]) => left.localeCompare(right, 'en'));

/** Validates one exact source dependency whenever the declaring package requires one. */
const validateSourceDependencyVersion = ({
  dependency,
  dependencyName,
  dependencyVersion,
  owner,
}) => {
  const normalizedVersion = dependencyVersion.startsWith('workspace:')
    ? dependencyVersion.slice('workspace:'.length)
    : dependencyVersion;
  const isExactVersion = STABLE_VERSION_PATTERN.test(normalizedVersion);

  if (owner.name === CLI_PACKAGE_NAME && !isExactVersion) {
    throw new Error(`${CLI_PACKAGE_NAME} must exact-pin ${dependencyName}.`);
  }
  if (isExactVersion && dependency.version !== normalizedVersion) {
    throw new Error(
      `${dependencyName} must be exact-pinned to its source package version ${dependency.version}.`,
    );
  }
};

/**
 * Discovers immediate package projects from one Moldea packages workspace.
 * @param workspaceRoot The packages repository root.
 * @returns Package manifests keyed by identity.
 */
export const discoverSourcePackageManifests = (workspaceRoot) => {
  const manifests = new Map();

  for (const collectionName of WORKSPACE_COLLECTION_NAMES) {
    const collectionDirectory = join(workspaceRoot, collectionName);
    if (!existsSync(collectionDirectory)) continue;

    for (const directoryEntry of readdirSync(collectionDirectory, { withFileTypes: true }).sort(
      ({ name: left }, { name: right }) => left.localeCompare(right, 'en'),
    )) {
      if (!directoryEntry.isDirectory()) continue;
      const projectDirectory = join(collectionName, directoryEntry.name);
      const manifestPath = join(workspaceRoot, projectDirectory, 'package.json');
      if (!existsSync(manifestPath)) continue;

      const manifest = readSourcePackageManifest(manifestPath, projectDirectory);
      if (manifests.has(manifest.name)) {
        throw new Error(`Duplicate source package identity ${manifest.name}.`);
      }
      manifests.set(manifest.name, manifest);
    }
  }

  if (!manifests.has(CLI_PACKAGE_NAME)) {
    throw new Error(`Source workspace requires ${CLI_PACKAGE_NAME}.`);
  }
  return manifests;
};

/**
 * Resolves local runtime dependencies in deterministic dependency-first order.
 * @param manifests Source manifests keyed by package identity.
 * @param selectedRootPackageNames Additional package roots required by the consumer.
 * @returns The runtime package closure.
 */
export const resolveRuntimePackageClosure = (manifests, selectedRootPackageNames = []) => {
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];

  const visitPackage = (packageName) => {
    if (visited.has(packageName)) return;
    if (visiting.has(packageName)) {
      throw new Error(`Source package dependency cycle includes ${packageName}.`);
    }
    const manifest = manifests.get(packageName);
    if (!manifest) {
      throw new Error(`Source candidate requires missing local package ${packageName}.`);
    }

    visiting.add(packageName);
    for (const [dependencyName, dependencyVersion] of getLocalDependencies(manifest, [
      'dependencies',
      'optionalDependencies',
    ])) {
      const dependency = manifests.get(dependencyName);
      if (!dependency) {
        throw new Error(`Source candidate requires missing local package ${dependencyName}.`);
      }
      validateSourceDependencyVersion({
        dependency,
        dependencyName,
        dependencyVersion,
        owner: manifest,
      });
      visitPackage(dependencyName);
    }
    visiting.delete(packageName);
    visited.add(packageName);
    ordered.push(manifest);
  };

  for (const rootPackageName of [CLI_PACKAGE_NAME, ...new Set(selectedRootPackageNames)].sort(
    (left, right) => left.localeCompare(right, 'en'),
  )) {
    visitPackage(rootPackageName);
  }

  return ordered;
};

/**
 * Extends a runtime closure with local build dependencies in dependency-first order.
 * @param manifests Source manifests keyed by package identity.
 * @param runtimeClosure The runtime packages that will be packed.
 * @returns The complete build closure.
 */
export const resolveBuildPackageClosure = (manifests, runtimeClosure) => {
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];

  const visitPackage = (manifest) => {
    if (visited.has(manifest.name)) return;
    if (visiting.has(manifest.name)) {
      throw new Error(`Source build dependency cycle includes ${manifest.name}.`);
    }

    visiting.add(manifest.name);
    for (const [dependencyName, dependencyVersion] of getLocalDependencies(manifest, [
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ])) {
      const dependency = manifests.get(dependencyName);
      if (!dependency) {
        throw new Error(`Source build requires missing local package ${dependencyName}.`);
      }
      validateSourceDependencyVersion({
        dependency,
        dependencyName,
        dependencyVersion,
        owner: manifest,
      });
      visitPackage(dependency);
    }
    visiting.delete(manifest.name);
    visited.add(manifest.name);
    ordered.push(manifest);
  };

  runtimeClosure.forEach(visitPackage);
  return ordered;
};

/**
 * Creates the dynamic source build and runtime pack plan.
 * @param workspaceRoot The packages repository root.
 * @param selectedRootPackageNames Additional package roots required by the consumer.
 * @returns The discovered manifests and dependency-first closures.
 */
export const createSourceCandidatePlan = (workspaceRoot, selectedRootPackageNames = []) => {
  const manifests = discoverSourcePackageManifests(workspaceRoot);
  const runtimeClosure = resolveRuntimePackageClosure(manifests, selectedRootPackageNames);
  const buildClosure = resolveBuildPackageClosure(manifests, runtimeClosure);
  return { buildClosure, manifests, runtimeClosure };
};

/** Runs one pnpm command and preserves its output for local or CI operators. */
const executePnpmCommand = ({ args, cwd }) => {
  const result = spawnSync('pnpm', args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(' ')} failed with exit code ${result.status}.`);
  }
};

/**
 * Builds and packs one exact dynamic package candidate closure.
 * @param options The source workspace, artifact directory, roots, and optional test seams.
 * @returns The validated artifact closure and package order.
 */
export const packSourceWorkspaceCandidate = ({
  artifactDirectory,
  executeCommand = executePnpmCommand,
  loadArtifacts = loadCandidateArtifacts,
  runtimeCompatibilityPublicationPath,
  selectedRootPackageNames = [],
  workspaceRoot,
}) => {
  mkdirSync(artifactDirectory, { recursive: true });
  const existingTarballs = readdirSync(artifactDirectory).filter((name) => name.endsWith('.tgz'));
  if (existingTarballs.length > 0) {
    throw new Error('Candidate artifact directory must not contain existing tarballs.');
  }
  const publicationArtifactPath = join(
    artifactDirectory,
    RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME,
  );
  if (existsSync(publicationArtifactPath)) {
    throw new Error('Candidate artifact directory must not contain a runtime publication.');
  }
  if (runtimeCompatibilityPublicationPath !== undefined) {
    parseRuntimeCompatibilityPublication(
      readFileSync(runtimeCompatibilityPublicationPath, 'utf8'),
    );
    copyFileSync(runtimeCompatibilityPublicationPath, publicationArtifactPath);
  }

  const { buildClosure, runtimeClosure } = createSourceCandidatePlan(
    workspaceRoot,
    selectedRootPackageNames,
  );
  for (const manifest of buildClosure) {
    executeCommand({
      args: ['--filter', manifest.name, 'build'],
      cwd: workspaceRoot,
    });
  }

  for (const manifest of runtimeClosure) {
    const beforeTarballs = new Set(
      readdirSync(artifactDirectory).filter((name) => name.endsWith('.tgz')),
    );
    executeCommand({
      args: ['pack', '--pack-destination', artifactDirectory],
      cwd: join(workspaceRoot, manifest.projectDirectory),
    });
    const createdTarballs = readdirSync(artifactDirectory).filter(
      (name) => name.endsWith('.tgz') && !beforeTarballs.has(name),
    );
    if (createdTarballs.length !== 1) {
      throw new Error(`Packing ${manifest.name} did not create exactly one candidate tarball.`);
    }
  }

  const candidate = loadArtifacts(artifactDirectory, selectedRootPackageNames);
  return {
    ...candidate,
    buildPackageNames: buildClosure.map(({ name }) => name),
    runtimeCompatibilityPublicationArtifact:
      runtimeCompatibilityPublicationPath === undefined
        ? null
        : RUNTIME_COMPATIBILITY_PUBLICATION_ARTIFACT_NAME,
    runtimePackageNames: runtimeClosure.map(({ name }) => name),
  };
};
