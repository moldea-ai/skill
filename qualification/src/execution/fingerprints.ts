import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { IRuntimeAdapterEntry, IRuntimeTarget } from '../compatibility/index.ts';
import { QUALIFICATION_ROOT, SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import {
  collectDirectoryFingerprintEntries,
  calculateSha256,
  type IDirectoryFingerprintEntry,
} from '../filesystem/index.ts';
import {
  isQualificationBehaviorBearingSourcePath,
  isQualificationTestFilePath,
  normalizeQualificationCaseCatalog,
  normalizeQualificationRuntimePackageLock,
  normalizeQualificationRuntimePackageManifest,
  normalizeQualificationToolingPackageLock,
  normalizeQualificationToolingPackageManifest,
  QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
} from '../input-identity/index.ts';

const QUALIFICATION_CASE_CATALOG_PATH = 'cases/cases.yaml';
const QUALIFICATION_PACKAGE_MANIFEST_PATH = 'package.json';
const QUALIFICATION_PACKAGE_LOCK_PATH = 'package-lock.json';
const TOOLING_PACKAGE_MANIFEST_PATH = 'package.json';
const TOOLING_PACKAGE_LOCK_PATH = 'package-lock.json';
const PROFILE_DOCUMENTATION_PATH = 'README.md';
const NON_BEHAVIORAL_COMPATIBILITY_FIELDS = new Set(['lastVerifiedAt', 'qualificationEvidence']);

// roots used to calculate one selected adapter's production evaluator identity
export type IQualificationExecutionDigestRoots = {
  evaluationHostRoot: string;
  packageCandidateRoot: string;
  qualificationRoot: string;
  repositoryRoot: string;
};

// roots whose production behavior can change actor or judge model execution
export type IQualificationModelHostDigestRoots = Pick<
  IQualificationExecutionDigestRoots,
  'evaluationHostRoot' | 'qualificationRoot' | 'repositoryRoot'
>;

// selected execution inputs whose behavior must remain current for adapter evidence
export type IQualificationExecutionDigestOptions = {
  caseIds: readonly string[];
  profileDirectory: string;
  roots?: IQualificationExecutionDigestRoots;
};

const DEFAULT_QUALIFICATION_EXECUTION_DIGEST_ROOTS: IQualificationExecutionDigestRoots = {
  evaluationHostRoot: path.join(SKILL_REPOSITORY_ROOT, 'tooling/codex-evaluation-host'),
  packageCandidateRoot: path.join(SKILL_REPOSITORY_ROOT, 'tooling/package-candidate'),
  qualificationRoot: QUALIFICATION_ROOT,
  repositoryRoot: SKILL_REPOSITORY_ROOT,
};

const DEFAULT_QUALIFICATION_MODEL_HOST_DIGEST_ROOTS: IQualificationModelHostDigestRoots =
  DEFAULT_QUALIFICATION_EXECUTION_DIGEST_ROOTS;

/** Removes publication metadata while retaining every behavioral compatibility field. */
const normalizeCompatibilityInput = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map(normalizeCompatibilityInput);
  }

  if (typeof input !== 'object' || input === null) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input)
      .filter(([fieldName]) => !NON_BEHAVIORAL_COMPATIBILITY_FIELDS.has(fieldName))
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([fieldName, fieldValue]) => [fieldName, normalizeCompatibilityInput(fieldValue)]),
  );
};

const isBehaviorBearingSourceEntry = (entry: IDirectoryFingerprintEntry): boolean =>
  isQualificationBehaviorBearingSourcePath(entry.path);

const collectPrefixedSourceEntries = async (
  rootDirectory: string,
  pathPrefix: string,
): Promise<IDirectoryFingerprintEntry[]> =>
  (await collectDirectoryFingerprintEntries(rootDirectory))
    .filter(isBehaviorBearingSourceEntry)
    .map((entry) => ({ ...entry, path: path.posix.join(pathPrefix, entry.path) }));

const collectQualificationProfileEntries = async (
  profileDirectory: string,
): Promise<IDirectoryFingerprintEntry[]> =>
  (await collectDirectoryFingerprintEntries(profileDirectory)).filter(
    (entry) =>
      entry.path !== PROFILE_DOCUMENTATION_PATH && !isQualificationTestFilePath(entry.path),
  );

/** Collects the single behavior-bearing resource profile shared by model execution. */
const collectResourceProfileEntries = async (
  repositoryRoot: string,
): Promise<IDirectoryFingerprintEntry[]> => {
  const entries = (
    await collectDirectoryFingerprintEntries(
      path.join(repositoryRoot, 'tooling/resource-calibration'),
    )
  )
    .filter(({ path: relativePath }) => relativePath === 'profiles.mjs')
    .map((entry) => ({
      ...entry,
      path: path.posix.join('tooling/resource-calibration', entry.path),
    }));
  if (entries.length !== 1) {
    throw new Error('Qualification resource profile identity requires profiles.mjs.');
  }
  return entries;
};

/** Creates one stable fingerprint entry for normalized boundary content. */
const createNormalizedFileEntry = async (
  absolutePath: string,
  relativePath: string,
  normalizedContent: unknown,
): Promise<IDirectoryFingerprintEntry> => {
  const stats = await lstat(absolutePath);
  if (!stats.isFile()) {
    throw new Error(`Qualification input ${relativePath} is not a regular file.`);
  }

  return {
    path: relativePath,
    kind: 'file',
    mode: stats.mode,
    sha256: calculateSha256(`${JSON.stringify(normalizedContent)}\n`),
  };
};

/** Calculates a stable digest for behavior-bearing compatibility data. */
export const calculateCompatibilityBehaviorDigest = (input: unknown): string =>
  calculateSha256(`${JSON.stringify(normalizeCompatibilityInput(input))}\n`);

/** Calculates the behavior digest for one selected target without including sibling targets. */
export const calculateQualificationTargetDigest = (
  adapter: IRuntimeAdapterEntry,
  target: IRuntimeTarget,
): string =>
  calculateCompatibilityBehaviorDigest({
    adapter: Object.fromEntries(
      Object.entries(adapter).filter(([fieldName]) => fieldName !== 'targets'),
    ),
    target,
  });

/** Calculates the selected package-source identity without unrelated adapters or targets. */
export const calculatePackagesQualificationDigest = (options: {
  adapter: IRuntimeAdapterEntry;
  matrixVersion: number;
  target: IRuntimeTarget;
}): string =>
  calculateCompatibilityBehaviorDigest({
    matrixVersion: options.matrixVersion,
    targetDigest: calculateQualificationTargetDigest(options.adapter, options.target),
  });

/**
 * Calculates the behavior-bearing digest for one adapter profile.
 * @returns A promise resolving to the profile digest without its operator documentation.
 */
export const calculateQualificationProfileDigest = async (
  profileDirectory: string,
): Promise<string> => {
  const entries = await collectQualificationProfileEntries(profileDirectory);
  return calculateSha256(`${JSON.stringify(entries)}\n`);
};

/**
 * Calculates the production host identity that can change actor or judge execution.
 * @returns A promise resolving to the model-host digest without unrelated orchestration code.
 */
export const calculateQualificationModelHostDigest = async (
  roots: IQualificationModelHostDigestRoots = DEFAULT_QUALIFICATION_MODEL_HOST_DIGEST_ROOTS,
): Promise<string> => {
  const qualificationModelHostRoot = path.join(roots.qualificationRoot, 'src', 'codex-host');
  const toolingPackageManifestPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_MANIFEST_PATH);
  const toolingPackageLockPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_LOCK_PATH);
  const [
    qualificationModelHostEntries,
    evaluationHostEntries,
    resourceProfileEntries,
    packageManifest,
    packageLock,
  ] = await Promise.all([
    collectPrefixedSourceEntries(qualificationModelHostRoot, 'qualification/src/codex-host'),
    collectPrefixedSourceEntries(roots.evaluationHostRoot, 'tooling/codex-evaluation-host'),
    collectResourceProfileEntries(roots.repositoryRoot),
    readFile(toolingPackageManifestPath, 'utf8'),
    readFile(toolingPackageLockPath, 'utf8'),
  ]);
  const normalizedEntries = await Promise.all([
    createNormalizedFileEntry(
      toolingPackageManifestPath,
      'package.json',
      normalizeQualificationToolingPackageManifest(
        JSON.parse(packageManifest) as unknown,
        QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
      ),
    ),
    createNormalizedFileEntry(
      toolingPackageLockPath,
      'package-lock.json',
      normalizeQualificationToolingPackageLock(
        JSON.parse(packageLock) as unknown,
        QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
      ),
    ),
  ]);
  const entries = [
    ...qualificationModelHostEntries,
    ...evaluationHostEntries,
    ...resourceProfileEntries,
    ...normalizedEntries,
  ].sort((left, right) => left.path.localeCompare(right.path, 'en'));

  return calculateSha256(`${JSON.stringify(entries)}\n`);
};

/**
 * Calculates the selected adapter's shared evaluator and profile execution identity.
 * @returns A promise resolving to the behavior-scoped qualification digest.
 */
export const calculateQualificationExecutionDigest = async (
  options: IQualificationExecutionDigestOptions,
): Promise<string> => {
  const roots = options.roots ?? DEFAULT_QUALIFICATION_EXECUTION_DIGEST_ROOTS;
  const qualificationSourceRoot = path.join(roots.qualificationRoot, 'src');
  const profileEntries = (await collectQualificationProfileEntries(options.profileDirectory)).map(
    (entry) => ({ ...entry, path: path.posix.join('qualification/profile', entry.path) }),
  );
  const packageManifestPath = path.join(
    roots.qualificationRoot,
    QUALIFICATION_PACKAGE_MANIFEST_PATH,
  );
  const packageLockPath = path.join(roots.qualificationRoot, QUALIFICATION_PACKAGE_LOCK_PATH);
  const caseCatalogPath = path.join(roots.qualificationRoot, QUALIFICATION_CASE_CATALOG_PATH);
  const toolingPackageManifestPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_MANIFEST_PATH);
  const toolingPackageLockPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_LOCK_PATH);
  const [
    qualificationSourceEntries,
    evaluationHostEntries,
    packageCandidateEntries,
    resourceProfileEntries,
    packageManifestSource,
    packageLockSource,
    caseCatalogSource,
    toolingPackageManifestSource,
    toolingPackageLockSource,
  ] = await Promise.all([
    collectPrefixedSourceEntries(qualificationSourceRoot, 'qualification/src'),
    collectPrefixedSourceEntries(roots.evaluationHostRoot, 'tooling/codex-evaluation-host'),
    collectPrefixedSourceEntries(roots.packageCandidateRoot, 'tooling/package-candidate'),
    collectResourceProfileEntries(roots.repositoryRoot),
    readFile(packageManifestPath, 'utf8'),
    readFile(packageLockPath, 'utf8'),
    readFile(caseCatalogPath, 'utf8'),
    readFile(toolingPackageManifestPath, 'utf8'),
    readFile(toolingPackageLockPath, 'utf8'),
  ]);
  const normalizedEntries = await Promise.all([
    createNormalizedFileEntry(
      packageManifestPath,
      'qualification/package.json',
      normalizeQualificationRuntimePackageManifest(JSON.parse(packageManifestSource) as unknown),
    ),
    createNormalizedFileEntry(
      packageLockPath,
      'qualification/package-lock.json',
      normalizeQualificationRuntimePackageLock(JSON.parse(packageLockSource) as unknown),
    ),
    createNormalizedFileEntry(
      caseCatalogPath,
      'qualification/cases/cases.yaml',
      normalizeQualificationCaseCatalog(caseCatalogSource, options.caseIds),
    ),
    createNormalizedFileEntry(
      toolingPackageManifestPath,
      'package.json',
      normalizeQualificationToolingPackageManifest(
        JSON.parse(toolingPackageManifestSource) as unknown,
        QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
      ),
    ),
    createNormalizedFileEntry(
      toolingPackageLockPath,
      'package-lock.json',
      normalizeQualificationToolingPackageLock(
        JSON.parse(toolingPackageLockSource) as unknown,
        QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
      ),
    ),
  ]);
  const entries = [
    ...qualificationSourceEntries,
    ...evaluationHostEntries,
    ...packageCandidateEntries,
    ...resourceProfileEntries,
    ...profileEntries,
    ...normalizedEntries,
  ].sort((left, right) => left.path.localeCompare(right.path, 'en'));

  return calculateSha256(`${JSON.stringify(entries)}\n`);
};
