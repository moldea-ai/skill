import path from 'node:path';

import { EXCLUDED_DIRECTORY_NAMES, SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import { calculateSha256 } from '../filesystem/index.ts';
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
import { executeProcess } from '../process/index.ts';

const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const BASELINE_PATH_PREFIXES = [
  'qualification/src',
  'qualification/cases/cases.yaml',
  'qualification/package.json',
  'qualification/package-lock.json',
  'qualification/profiles/custom/custom',
  'package.json',
  'package-lock.json',
  'tooling/codex-evaluation-host',
  'tooling/package-candidate',
] as const;
const QUALIFICATION_CASE_CATALOG_PATH = 'qualification/cases/cases.yaml';
const QUALIFICATION_PACKAGE_MANIFEST_PATH = 'qualification/package.json';
const QUALIFICATION_PACKAGE_LOCK_PATH = 'qualification/package-lock.json';
const TOOLING_PACKAGE_MANIFEST_PATH = 'package.json';
const TOOLING_PACKAGE_LOCK_PATH = 'package-lock.json';
const CUSTOM_PROFILE_DOCUMENTATION_PATH = 'qualification/profiles/custom/custom/README.md';
const SHARED_SOURCE_PATH_PREFIXES = [
  'qualification/src/',
  'tooling/codex-evaluation-host/',
  'tooling/package-candidate/',
] as const;
const baselineDigestPromises = new Map<string, Promise<string>>();

type IGitTreeEntry = {
  mode: string;
  objectId: string;
  path: string;
};

const hasExcludedPathSegment = (relativePath: string): boolean =>
  relativePath.split('/').some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment));

const isBehaviorBearingBaselinePath = (relativePath: string): boolean => {
  if (hasExcludedPathSegment(relativePath) || isQualificationTestFilePath(relativePath)) {
    return false;
  }
  if (relativePath === CUSTOM_PROFILE_DOCUMENTATION_PATH) {
    return false;
  }
  return (
    !SHARED_SOURCE_PATH_PREFIXES.some((pathPrefix) => relativePath.startsWith(pathPrefix)) ||
    isQualificationBehaviorBearingSourcePath(relativePath)
  );
};

/**
 * Parses the NUL-delimited blob inventory emitted by Git ls-tree.
 * @throws If an entry is not a complete Git blob record.
 */
const parseGitTreeEntries = (source: string): IGitTreeEntry[] =>
  source
    .split('\0')
    .filter((record) => record !== '')
    .map((record) => {
      const separatorIndex = record.indexOf('\t');
      const [mode, objectType, objectId] = record.slice(0, separatorIndex).split(' ');
      const relativePath = record.slice(separatorIndex + 1);

      if (
        separatorIndex === -1 ||
        mode === undefined ||
        objectType !== 'blob' ||
        objectId === undefined ||
        relativePath === ''
      ) {
        throw new Error('Qualification baseline Git tree contains an unsupported entry.');
      }

      return { mode, objectId, path: relativePath };
    });

/**
 * Reads one source blob from an exact qualification repository commit.
 * @throws If Git cannot resolve or read the requested blob.
 */
const readCommitFile = async (
  repositoryRoot: string,
  commit: string,
  relativePath: string,
): Promise<string> => {
  const { stdout } = await executeProcess({
    command: 'git',
    args: ['cat-file', 'blob', `${commit}:${relativePath}`],
    cwd: repositoryRoot,
  });
  return stdout;
};

/**
 * Calculates the reusable Custom-baseline identity from one immutable source commit.
 * @param commit The exact qualification repository commit recorded by public evidence.
 * @param repositoryRoot The repository that owns qualification and shared evaluator sources.
 * @returns A promise resolving to the universal evaluator and Custom-profile digest.
 * @throws If the commit is invalid or its required baseline inputs cannot be read or validated.
 */
export const calculateQualificationBaselineDigestAtCommit = async (
  commit: string,
  repositoryRoot: string = SKILL_REPOSITORY_ROOT,
): Promise<string> => {
  if (!GIT_COMMIT_PATTERN.test(commit)) {
    throw new Error('Qualification baseline identity requires an exact Git commit.');
  }

  const resolvedRepositoryRoot = path.resolve(repositoryRoot);
  const cacheKey = `${resolvedRepositoryRoot}\0${commit}`;
  const cachedDigest = baselineDigestPromises.get(cacheKey);
  if (cachedDigest !== undefined) {
    return cachedDigest;
  }

  const digestPromise = (async () => {
    const { stdout } = await executeProcess({
      command: 'git',
      args: ['ls-tree', '-r', '-z', commit, '--', ...BASELINE_PATH_PREFIXES],
      cwd: resolvedRepositoryRoot,
    });
    const treeEntries = parseGitTreeEntries(stdout);
    const packageLockEntry = treeEntries.find(
      ({ path: relativePath }) => relativePath === QUALIFICATION_PACKAGE_LOCK_PATH,
    );
    const packageManifestEntry = treeEntries.find(
      ({ path: relativePath }) => relativePath === QUALIFICATION_PACKAGE_MANIFEST_PATH,
    );
    const caseCatalogEntry = treeEntries.find(
      ({ path: relativePath }) => relativePath === QUALIFICATION_CASE_CATALOG_PATH,
    );
    const toolingPackageManifestEntry = treeEntries.find(
      ({ path: relativePath }) => relativePath === TOOLING_PACKAGE_MANIFEST_PATH,
    );
    const toolingPackageLockEntry = treeEntries.find(
      ({ path: relativePath }) => relativePath === TOOLING_PACKAGE_LOCK_PATH,
    );

    if (
      packageLockEntry === undefined ||
      packageManifestEntry === undefined ||
      caseCatalogEntry === undefined ||
      toolingPackageManifestEntry === undefined ||
      toolingPackageLockEntry === undefined
    ) {
      throw new Error('Qualification baseline source inputs are incomplete.');
    }

    const [
      packageLockSource,
      packageManifestSource,
      caseCatalogSource,
      toolingPackageManifestSource,
      toolingPackageLockSource,
    ] = await Promise.all([
      readCommitFile(resolvedRepositoryRoot, commit, QUALIFICATION_PACKAGE_LOCK_PATH),
      readCommitFile(resolvedRepositoryRoot, commit, QUALIFICATION_PACKAGE_MANIFEST_PATH),
      readCommitFile(resolvedRepositoryRoot, commit, QUALIFICATION_CASE_CATALOG_PATH),
      readCommitFile(resolvedRepositoryRoot, commit, TOOLING_PACKAGE_MANIFEST_PATH),
      readCommitFile(resolvedRepositoryRoot, commit, TOOLING_PACKAGE_LOCK_PATH),
    ]);
    const entries = treeEntries
      .filter(
        ({ path: relativePath }) =>
          relativePath !== QUALIFICATION_PACKAGE_LOCK_PATH &&
          relativePath !== QUALIFICATION_PACKAGE_MANIFEST_PATH &&
          relativePath !== QUALIFICATION_CASE_CATALOG_PATH &&
          relativePath !== TOOLING_PACKAGE_MANIFEST_PATH &&
          relativePath !== TOOLING_PACKAGE_LOCK_PATH &&
          isBehaviorBearingBaselinePath(relativePath),
      )
      .map(({ mode, objectId, path: relativePath }) => ({
        mode,
        objectId,
        path: relativePath,
      }));
    entries.push(
      {
        mode: caseCatalogEntry.mode,
        objectId: calculateSha256(
          `${JSON.stringify(normalizeQualificationCaseCatalog(caseCatalogSource, []))}\n`,
        ),
        path: QUALIFICATION_CASE_CATALOG_PATH,
      },
      {
        mode: packageLockEntry.mode,
        objectId: calculateSha256(
          `${JSON.stringify(
            normalizeQualificationRuntimePackageLock(JSON.parse(packageLockSource) as unknown),
          )}\n`,
        ),
        path: QUALIFICATION_PACKAGE_LOCK_PATH,
      },
      {
        mode: packageManifestEntry.mode,
        objectId: calculateSha256(
          `${JSON.stringify(
            normalizeQualificationRuntimePackageManifest(
              JSON.parse(packageManifestSource) as unknown,
            ),
          )}\n`,
        ),
        path: QUALIFICATION_PACKAGE_MANIFEST_PATH,
      },
      {
        mode: toolingPackageLockEntry.mode,
        objectId: calculateSha256(
          `${JSON.stringify(
            normalizeQualificationToolingPackageLock(
              JSON.parse(toolingPackageLockSource) as unknown,
              QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
            ),
          )}\n`,
        ),
        path: TOOLING_PACKAGE_LOCK_PATH,
      },
      {
        mode: toolingPackageManifestEntry.mode,
        objectId: calculateSha256(
          `${JSON.stringify(
            normalizeQualificationToolingPackageManifest(
              JSON.parse(toolingPackageManifestSource) as unknown,
              QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
            ),
          )}\n`,
        ),
        path: TOOLING_PACKAGE_MANIFEST_PATH,
      },
    );
    entries.sort((left, right) => left.path.localeCompare(right.path, 'en'));

    return calculateSha256(`${JSON.stringify(entries)}\n`);
  })();

  baselineDigestPromises.set(cacheKey, digestPromise);
  return digestPromise;
};
