import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { EXCLUDED_DIRECTORY_NAMES, SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import { QualificationCaseCatalogSchema } from '../contracts/index.ts';
import { calculateSha256 } from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';

const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const BASELINE_PATH_PREFIXES = [
  'qualification/src',
  'qualification/cases/cases.yaml',
  'qualification/package.json',
  'qualification/package-lock.json',
  'qualification/profiles/custom/custom',
  'tooling/codex-evaluation-host',
  'tooling/package-candidate',
] as const;
const QUALIFICATION_CASE_CATALOG_PATH = 'qualification/cases/cases.yaml';
const QUALIFICATION_PACKAGE_MANIFEST_PATH = 'qualification/package.json';
const QUALIFICATION_PACKAGE_LOCK_PATH = 'qualification/package-lock.json';
const CUSTOM_PROFILE_DOCUMENTATION_PATH = 'qualification/profiles/custom/custom/README.md';
const TEST_FILE_PATTERN = /\.test-(?:bench|e2e|integration|unit)\.[^/]+$/u;
const baselineDigestPromises = new Map<string, Promise<string>>();

type IGitTreeEntry = {
  mode: string;
  objectId: string;
  path: string;
};

const isPlainRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** Recursively orders record fields so formatting and property order cannot affect identity. */
const normalizeRecord = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map(normalizeRecord);
  }
  if (!isPlainRecord(input)) {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([fieldName, fieldValue]) => [fieldName, normalizeRecord(fieldValue)]),
  );
};

/**
 * Keeps only production-resolved packages from an npm lockfile.
 * @throws If the lockfile package inventory is malformed.
 */
const normalizeRuntimePackageLock = (input: unknown): unknown => {
  if (!isPlainRecord(input) || !isPlainRecord(input['packages'])) {
    throw new Error('Qualification package lock does not contain a packages object.');
  }

  const runtimePackages = Object.fromEntries(
    Object.entries(input['packages'])
      .filter(([packagePath, packageRecord]) => {
        if (packagePath === '') return true;
        if (!isPlainRecord(packageRecord)) {
          throw new Error(`Qualification package lock entry ${packagePath} is invalid.`);
        }
        return packageRecord['dev'] !== true;
      })
      .map(([packagePath, packageRecord]) => {
        if (packagePath !== '' || !isPlainRecord(packageRecord)) {
          return [packagePath, packageRecord];
        }

        return [
          packagePath,
          Object.fromEntries(
            Object.entries(packageRecord).filter(([fieldName]) => fieldName !== 'devDependencies'),
          ),
        ];
      }),
  );

  return normalizeRecord({
    lockfileVersion: input['lockfileVersion'],
    name: input['name'],
    packages: runtimePackages,
    requires: input['requires'],
    version: input['version'],
  });
};

/**
 * Keeps package fields that can change how the qualification runtime starts or resolves code.
 * @throws If the package manifest is malformed.
 */
const normalizeRuntimePackageManifest = (input: unknown): unknown => {
  if (!isPlainRecord(input)) {
    throw new Error('Qualification package manifest is invalid.');
  }
  const scripts = input['scripts'];

  return normalizeRecord({
    dependencies: input['dependencies'],
    engines: input['engines'],
    scripts: isPlainRecord(scripts) ? { qualification: scripts['qualification'] } : undefined,
    type: input['type'],
  });
};

/**
 * Keeps only universal cases whose behavior the Custom baseline establishes.
 * @throws If the case catalog does not satisfy the qualification contract.
 */
const normalizeUniversalCaseCatalog = (source: string): unknown => {
  const catalog = QualificationCaseCatalogSchema.parse(parseYaml(source) as unknown);

  return normalizeRecord({
    version: catalog.version,
    cases: catalog.cases.filter(({ layer }) => layer === 'universal-baseline'),
  });
};

const hasExcludedPathSegment = (relativePath: string): boolean =>
  relativePath.split('/').some((segment) => EXCLUDED_DIRECTORY_NAMES.has(segment));

const isBehaviorBearingBaselinePath = (relativePath: string): boolean => {
  if (hasExcludedPathSegment(relativePath) || TEST_FILE_PATTERN.test(relativePath)) {
    return false;
  }
  if (relativePath === CUSTOM_PROFILE_DOCUMENTATION_PATH) {
    return false;
  }
  return true;
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

    if (
      packageLockEntry === undefined ||
      packageManifestEntry === undefined ||
      caseCatalogEntry === undefined
    ) {
      throw new Error('Qualification baseline source inputs are incomplete.');
    }

    const [packageLockSource, packageManifestSource, caseCatalogSource] = await Promise.all([
      readCommitFile(resolvedRepositoryRoot, commit, QUALIFICATION_PACKAGE_LOCK_PATH),
      readCommitFile(resolvedRepositoryRoot, commit, QUALIFICATION_PACKAGE_MANIFEST_PATH),
      readCommitFile(resolvedRepositoryRoot, commit, QUALIFICATION_CASE_CATALOG_PATH),
    ]);
    const entries = treeEntries
      .filter(
        ({ path: relativePath }) =>
          relativePath !== QUALIFICATION_PACKAGE_LOCK_PATH &&
          relativePath !== QUALIFICATION_PACKAGE_MANIFEST_PATH &&
          relativePath !== QUALIFICATION_CASE_CATALOG_PATH &&
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
          `${JSON.stringify(normalizeUniversalCaseCatalog(caseCatalogSource))}\n`,
        ),
        path: QUALIFICATION_CASE_CATALOG_PATH,
      },
      {
        mode: packageLockEntry.mode,
        objectId: calculateSha256(
          `${JSON.stringify(normalizeRuntimePackageLock(JSON.parse(packageLockSource) as unknown))}\n`,
        ),
        path: QUALIFICATION_PACKAGE_LOCK_PATH,
      },
      {
        mode: packageManifestEntry.mode,
        objectId: calculateSha256(
          `${JSON.stringify(
            normalizeRuntimePackageManifest(JSON.parse(packageManifestSource) as unknown),
          )}\n`,
        ),
        path: QUALIFICATION_PACKAGE_MANIFEST_PATH,
      },
    );
    entries.sort((left, right) => left.path.localeCompare(right.path, 'en'));

    return calculateSha256(`${JSON.stringify(entries)}\n`);
  })();

  baselineDigestPromises.set(cacheKey, digestPromise);
  return digestPromise;
};
