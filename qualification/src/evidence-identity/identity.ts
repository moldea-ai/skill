import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { QUALIFICATION_ROOT, SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import {
  QualificationCaseScenarioSchema,
  QualificationProfileSchema,
  QualificationProfileSourceSchema,
  type IQualificationProfile,
  type IQualificationSelection,
} from '../contracts/index.ts';
import {
  calculateSha256,
  collectDirectoryFingerprintEntries,
  normalizePortableFilesystemMode,
  resolveContainedPath,
} from '../../../src/filesystem/index.ts';
import {
  isQualificationBehaviorBearingSourcePath,
  isQualificationTestFilePath,
  normalizeQualificationRuntimePackageLock,
  normalizeQualificationRuntimePackageManifest,
  normalizeQualificationToolingPackageLock,
  normalizeQualificationToolingPackageManifest,
  QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
} from '../input-identity/index.ts';
import {
  findQualificationProfileTarget,
  loadQualificationProfileIndex,
} from '../storage/profile-paths.ts';
import {
  QualificationCompatibilityIdentitySchema,
  QualificationLogicalInputBundleSchema,
  type IQualificationCompatibilityIdentity,
  type IQualificationLogicalInputBundle,
  type IQualificationLogicalSourceEntry,
} from './types.ts';

const MAXIMUM_IDENTITY_ENTRY_COUNT = 4096;
const TYPE_DECLARATION_FILE_PATTERN = /\.d\.[^/]+$/u;
const PROFILE_DOCUMENTATION_PATH = 'README.md';
const QUALIFICATION_PACKAGE_MANIFEST_PATH = 'qualification/package.json';
const QUALIFICATION_PACKAGE_LOCK_PATH = 'qualification/package-lock.json';
const TOOLING_PACKAGE_MANIFEST_PATH = 'package.json';
const TOOLING_PACKAGE_LOCK_PATH = 'package-lock.json';
const CONTROL_PLANE_DIRECTORY_PREFIXES = [
  'qualification/src/storage/',
  'qualification/src/evidence-identity/',
  'qualification/src/baseline/',
] as const;
const CONTROL_PLANE_FILE_PATHS = new Set([
  'qualification/src/compatibility/loader.ts',
  'qualification/src/cli/runner.ts',
  'qualification/src/result/recorded-contract.ts',
  'qualification/src/result/evidence.ts',
  'qualification/src/result/recorder.ts',
  'qualification/src/result/index.ts',
]);
const MODEL_STAGE_SOURCE_FILE_PATHS = new Set([
  'qualification/src/execution/workspaces.ts',
  'src/resources/profiles.ts',
  QUALIFICATION_PACKAGE_MANIFEST_PATH,
  QUALIFICATION_PACKAGE_LOCK_PATH,
  TOOLING_PACKAGE_MANIFEST_PATH,
  TOOLING_PACKAGE_LOCK_PATH,
]);
const MODEL_STAGE_SOURCE_DIRECTORY_PREFIXES = [
  'qualification/src/codex-host/',
  'src/execution/host/',
] as const;

type IIdentityRoots = {
  qualificationRoot: string;
  repositoryRoot: string;
};

type IProfileSource = {
  listEntries: (profileRelativeDirectory: string) => Promise<IQualificationLogicalSourceEntry[]>;
  readProfileFile: (profileRelativeDirectory: string, relativePath: string) => Promise<string>;
};

const normalizeRecord = (input: unknown): unknown => {
  if (Array.isArray(input)) {
    return input.map(normalizeRecord);
  }
  if (input === null || typeof input !== 'object') {
    return input;
  }

  return Object.fromEntries(
    Object.entries(input)
      .sort(([left], [right]) => left.localeCompare(right, 'en'))
      .map(([fieldName, fieldValue]) => [fieldName, normalizeRecord(fieldValue)]),
  );
};

const isPlainRecord = (input: unknown): input is Record<string, unknown> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

const getDefaultRoots = (repositoryRoot: string = SKILL_REPOSITORY_ROOT): IIdentityRoots => ({
  qualificationRoot: path.join(repositoryRoot, 'qualification'),
  repositoryRoot,
});

const normalizeFilesystemMode = (
  kind: 'file' | 'symlink',
  mode: number,
): IQualificationLogicalSourceEntry['mode'] => {
  return normalizePortableFilesystemMode(kind, mode).toString(
    8,
  ) as IQualificationLogicalSourceEntry['mode'];
};

const assertBoundedEntries = (entries: readonly unknown[], label: string): void => {
  if (entries.length > MAXIMUM_IDENTITY_ENTRY_COUNT) {
    throw new Error(`${label} exceeds the supported identity entry count.`);
  }
};

const createLogicalEntry = (
  relativePath: string,
  mode: IQualificationLogicalSourceEntry['mode'],
  content: Buffer | string,
): IQualificationLogicalSourceEntry => ({
  path: relativePath,
  kind: mode === '120000' ? 'symlink' : 'file',
  mode,
  sha256: calculateSha256(content),
});

/** Returns whether one repository path is evaluator-bearing source. */
export const isQualificationEvaluatorSourcePath = (relativePath: string): boolean => {
  if (!relativePath.startsWith('qualification/src/')) {
    return false;
  }
  if (
    isQualificationTestFilePath(relativePath) ||
    TYPE_DECLARATION_FILE_PATTERN.test(relativePath)
  ) {
    return false;
  }

  return (
    !CONTROL_PLANE_FILE_PATHS.has(relativePath) &&
    !CONTROL_PLANE_DIRECTORY_PREFIXES.some((prefix) => relativePath.startsWith(prefix))
  );
};

/** Returns whether one evaluator input can change the model-visible execution boundary. */
export const isQualificationModelStageSourcePath = (relativePath: string): boolean =>
  MODEL_STAGE_SOURCE_FILE_PATHS.has(relativePath) ||
  MODEL_STAGE_SOURCE_DIRECTORY_PREFIXES.some((prefix) => relativePath.startsWith(prefix));

const createNormalizedEntry = (
  relativePath: string,
  mode: IQualificationLogicalSourceEntry['mode'],
  input: unknown,
): IQualificationLogicalSourceEntry =>
  createLogicalEntry(relativePath, mode, `${JSON.stringify(normalizeRecord(input))}\n`);

const createCurrentEvaluatorEntries = async (
  roots: IIdentityRoots,
): Promise<IQualificationLogicalSourceEntry[]> => {
  const collectSourceEntries = async (
    sourceRoot: string,
    pathPrefix: string,
    predicate: (relativePath: string) => boolean,
  ): Promise<IQualificationLogicalSourceEntry[]> => {
    const entries = await collectDirectoryFingerprintEntries(sourceRoot);
    assertBoundedEntries(entries, pathPrefix);

    return entries
      .filter(({ path: relativePath }) => predicate(path.posix.join(pathPrefix, relativePath)))
      .map((entry) => ({
        path: path.posix.join(pathPrefix, entry.path),
        kind: entry.kind,
        mode: normalizeFilesystemMode(entry.kind, entry.mode),
        sha256: entry.sha256,
      }));
  };

  const [qualificationEntries, hostEntries, candidateEntries, resourceProfileEntries] =
    await Promise.all([
      collectSourceEntries(
        path.join(roots.qualificationRoot, 'src'),
        'qualification/src',
        isQualificationEvaluatorSourcePath,
      ),
      collectSourceEntries(
        path.join(roots.repositoryRoot, 'src/execution/host'),
        'src/execution/host',
        (relativePath) =>
          isQualificationBehaviorBearingSourcePath(
            relativePath.slice('src/execution/host/'.length),
          ),
      ),
      collectSourceEntries(
        path.join(roots.repositoryRoot, 'src/packages'),
        'src/packages',
        (relativePath) =>
          isQualificationBehaviorBearingSourcePath(relativePath.slice('src/packages/'.length)),
      ),
      collectSourceEntries(
        path.join(roots.repositoryRoot, 'src/resources'),
        'src/resources',
        (relativePath) => relativePath === 'src/resources/profiles.ts',
      ),
    ]);
  if (resourceProfileEntries.length !== 1) {
    throw new Error('Qualification evaluator identity requires the shared resource profile.');
  }
  const qualificationManifestPath = path.join(
    roots.repositoryRoot,
    QUALIFICATION_PACKAGE_MANIFEST_PATH,
  );
  const toolingManifestPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_MANIFEST_PATH);
  const toolingLockPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_LOCK_PATH);
  const [qualificationManifest, toolingManifest, toolingLock] = await Promise.all([
    readFile(qualificationManifestPath, 'utf8'),
    readFile(toolingManifestPath, 'utf8'),
    readFile(toolingLockPath, 'utf8'),
  ]);
  const normalizedEntries = await Promise.all([
    lstat(qualificationManifestPath).then((stats) =>
      createNormalizedEntry(
        QUALIFICATION_PACKAGE_MANIFEST_PATH,
        normalizeFilesystemMode('file', stats.mode),
        normalizeQualificationRuntimePackageManifest(JSON.parse(qualificationManifest) as unknown),
      ),
    ),
    lstat(toolingLockPath).then((stats) =>
      createNormalizedEntry(
        QUALIFICATION_PACKAGE_LOCK_PATH,
        normalizeFilesystemMode('file', stats.mode),
        normalizeQualificationRuntimePackageLock(JSON.parse(toolingLock) as unknown),
      ),
    ),
    lstat(toolingManifestPath).then((stats) =>
      createNormalizedEntry(
        TOOLING_PACKAGE_MANIFEST_PATH,
        normalizeFilesystemMode('file', stats.mode),
        normalizeQualificationToolingPackageManifest(
          JSON.parse(toolingManifest) as unknown,
          QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
        ),
      ),
    ),
    lstat(toolingLockPath).then((stats) =>
      createNormalizedEntry(
        TOOLING_PACKAGE_LOCK_PATH,
        normalizeFilesystemMode('file', stats.mode),
        normalizeQualificationToolingPackageLock(
          JSON.parse(toolingLock) as unknown,
          QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
        ),
      ),
    ),
  ]);

  return [
    ...qualificationEntries,
    ...hostEntries,
    ...candidateEntries,
    ...resourceProfileEntries,
    ...normalizedEntries,
  ].sort((left, right) => left.path.localeCompare(right.path, 'en'));
};

/** Calculates the version-1 evaluator digest from the current filesystem. */
export const calculateQualificationEvaluatorDigest = async (
  repositoryRoot: string = SKILL_REPOSITORY_ROOT,
): Promise<string> =>
  calculateSha256(
    `${JSON.stringify(await createCurrentEvaluatorEntries(getDefaultRoots(repositoryRoot)))}\n`,
  );

/** Calculates the model-stage evaluator digest without scheduling or result aggregation. */
export const calculateQualificationModelStageEvaluatorDigest = async (
  repositoryRoot: string = SKILL_REPOSITORY_ROOT,
): Promise<string> => {
  const entries = (await createCurrentEvaluatorEntries(getDefaultRoots(repositoryRoot))).filter(
    ({ path: relativePath }) => isQualificationModelStageSourcePath(relativePath),
  );

  return calculateSha256(`${JSON.stringify(entries)}\n`);
};

const createCanonicalProfile = (profile: IQualificationProfile): unknown =>
  normalizeRecord({
    version: profile.version,
    adapterId: profile.adapterId,
    implementationId: profile.implementationId,
    title: profile.title,
    description: profile.description,
    ...(profile.runtimePackages === undefined ? {} : { runtimePackages: profile.runtimePackages }),
    probesFile: profile.probesFile,
    cases: profile.cases.map(({ id, scenarioFile }) => ({ id, scenarioFile })),
  });

const createLogicalInputBundle = async (options: {
  profileRelativeDirectory: string;
  profileSource: IProfileSource;
  selection: IQualificationSelection;
}): Promise<IQualificationLogicalInputBundle> => {
  const profileSource = QualificationProfileSourceSchema.parse(
    parseYaml(
      await options.profileSource.readProfileFile(options.profileRelativeDirectory, 'profile.yaml'),
    ) as unknown,
  );
  const physicalEntries = await options.profileSource.listEntries(options.profileRelativeDirectory);
  const scenarioPaths = physicalEntries
    .map(({ path: relativePath }) => relativePath)
    .filter((relativePath) => /^cases\/c[1-9][0-9]*\/scenario\.yaml$/u.test(relativePath))
    .sort((left, right) => left.localeCompare(right, 'en'));

  if (scenarioPaths.length === 0) {
    throw new Error('Qualification logical profile has no discovered cases.');
  }

  const scenarios = await Promise.all(
    scenarioPaths.map(async (scenarioPath) =>
      QualificationCaseScenarioSchema.parse(
        parseYaml(
          await options.profileSource.readProfileFile(
            options.profileRelativeDirectory,
            scenarioPath,
          ),
        ) as unknown,
      ),
    ),
  );
  const profile = QualificationProfileSchema.parse({
    ...profileSource,
    cases: scenarios.map((scenario, index) => ({
      id: scenario.id,
      projectDirectory: path.posix.dirname(scenarioPaths[index]!),
      scenarioFile: 'scenario.yaml',
    })),
  });

  if (
    profile.adapterId !== options.selection.adapterId ||
    profile.implementationId !== options.selection.implementationId
  ) {
    throw new Error('Qualification logical profile identity does not match its selection.');
  }

  const caseIds = profile.cases.map(({ id }) => id);
  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error('Qualification logical profile case ids must be unique.');
  }
  const logicalEntries = physicalEntries
    .filter(
      ({ path: relativePath }) =>
        relativePath !== 'profile.yaml' && relativePath !== PROFILE_DOCUMENTATION_PATH,
    )
    .map((entry) => {
      const owningCases = profile.cases.filter(
        ({ projectDirectory }) =>
          entry.path === projectDirectory || entry.path.startsWith(`${projectDirectory}/`),
      );

      if (owningCases.length > 1) {
        throw new Error(`Qualification profile path has overlapping case ownership: ${entry.path}`);
      }
      const owningCase = owningCases[0];

      if (owningCase === undefined) {
        return { ...entry, path: path.posix.join('profile', entry.path) };
      }

      const caseRelativePath = entry.path.slice(owningCase.projectDirectory.length + 1);
      if (caseRelativePath === '') {
        throw new Error(`Qualification case input must be a file: ${entry.path}`);
      }

      return { ...entry, path: path.posix.join('cases', owningCase.id, caseRelativePath) };
    })
    .sort((left, right) => left.path.localeCompare(right.path, 'en'));

  if (
    new Set(logicalEntries.map(({ path: relativePath }) => relativePath)).size !==
    logicalEntries.length
  ) {
    throw new Error('Qualification logical input paths must be unique.');
  }

  return QualificationLogicalInputBundleSchema.parse({
    version: 1,
    selection: options.selection,
    profile: createCanonicalProfile(profile),
    caseCatalog: normalizeRecord({
      version: profile.version,
      cases: scenarios.map(({ challenge, description, id, layer, title }) => ({
        id,
        title,
        layer,
        description,
        challenge,
      })),
    }),
    files: logicalEntries,
  });
};

/** Creates one canonical logical target bundle from a current short profile tree. */
export const createQualificationLogicalInputBundle = async (options: {
  selection: IQualificationSelection;
  qualificationRoot?: string;
}): Promise<IQualificationLogicalInputBundle> => {
  const qualificationRoot = options.qualificationRoot ?? QUALIFICATION_ROOT;
  const profilesRoot = path.join(qualificationRoot, 'profiles');
  const index = await loadQualificationProfileIndex(profilesRoot);
  const indexedTarget = findQualificationProfileTarget(index, options.selection);

  if (indexedTarget === null) {
    throw new Error(
      `Qualification profile index does not contain ${options.selection.adapterId}/${options.selection.implementationId}.`,
    );
  }

  const profileDirectory = resolveContainedPath(profilesRoot, indexedTarget.key);
  return createLogicalInputBundle({
    profileRelativeDirectory: indexedTarget.key,
    profileSource: {
      listEntries: async () => {
        const entries = await collectDirectoryFingerprintEntries(profileDirectory);
        assertBoundedEntries(entries, 'Qualification logical profile');
        return entries.map((entry) => ({
          path: entry.path,
          kind: entry.kind,
          mode: normalizeFilesystemMode(entry.kind, entry.mode),
          sha256: entry.sha256,
        }));
      },
      readProfileFile: async (_profileRelativeDirectory, relativePath) =>
        readFile(resolveContainedPath(profileDirectory, relativePath), 'utf8'),
    },
    selection: options.selection,
  });
};

/** Calculates one target's canonical logical-input digest from current short storage. */
export const calculateQualificationLogicalInputDigest = async (options: {
  selection: IQualificationSelection;
  qualificationRoot?: string;
}): Promise<string> =>
  calculateSha256(`${JSON.stringify(await createQualificationLogicalInputBundle(options))}\n`);

/** Projects the exact shared and case-owned inputs visible to one qualification case. */
const createQualificationCaseModelInput = (
  bundle: IQualificationLogicalInputBundle,
  caseId: string,
): unknown => {
  if (!isPlainRecord(bundle.profile) || !Array.isArray(bundle.profile['cases'])) {
    throw new Error('Qualification case identity requires a canonical profile.');
  }
  if (!isPlainRecord(bundle.caseCatalog) || !Array.isArray(bundle.caseCatalog['cases'])) {
    throw new Error('Qualification case identity requires a canonical case catalog.');
  }
  const profileCases = bundle.profile['cases'].filter(
    (profileCase) => isPlainRecord(profileCase) && profileCase['id'] === caseId,
  );
  const catalogCases = bundle.caseCatalog['cases'].filter(
    (catalogCase) => isPlainRecord(catalogCase) && catalogCase['id'] === caseId,
  );
  if (profileCases.length !== 1 || catalogCases.length !== 1) {
    throw new Error(`Qualification case identity cannot resolve ${caseId}.`);
  }

  return {
    version: 1,
    selection: bundle.selection,
    profile: { ...bundle.profile, cases: profileCases },
    caseCatalog: { ...bundle.caseCatalog, cases: catalogCases },
    files: bundle.files.filter(
      ({ path: relativePath }) =>
        relativePath.startsWith('profile/') || relativePath.startsWith(`cases/${caseId}/`),
    ),
  };
};

const calculateCaseModelInputDigests = (
  bundle: IQualificationLogicalInputBundle,
  caseIds: readonly string[],
): Record<string, string> =>
  Object.fromEntries(
    caseIds.map((caseId) => [
      caseId,
      calculateSha256(`${JSON.stringify(createQualificationCaseModelInput(bundle, caseId))}\n`),
    ]),
  );

/** Calculates exact model-input digests for selected cases from current storage. */
export const calculateQualificationCaseModelInputDigests = async (options: {
  caseIds: readonly string[];
  qualificationRoot?: string;
  selection: IQualificationSelection;
}): Promise<Record<string, string>> =>
  calculateCaseModelInputDigests(
    await createQualificationLogicalInputBundle(options),
    options.caseIds,
  );

const calculateBaselineEvaluatorDigest = (
  qualificationEvaluatorDigest: string,
  customLogicalInputDigest: string,
): string =>
  calculateSha256(
    `${JSON.stringify({
      version: 1,
      qualificationEvaluatorDigest,
      customLogicalInputDigest,
    })}\n`,
  );

/** Creates all qualification compatibility identities from current short storage. */
export const createQualificationCompatibilityIdentity = async (options: {
  qualificationRoot?: string;
  repositoryRoot?: string;
  selection: IQualificationSelection;
}): Promise<IQualificationCompatibilityIdentity> => {
  const repositoryRoot = options.repositoryRoot ?? SKILL_REPOSITORY_ROOT;
  const qualificationRoot = options.qualificationRoot ?? path.join(repositoryRoot, 'qualification');
  const [qualificationEvaluatorDigest, qualificationLogicalInputDigest, customLogicalInputDigest] =
    await Promise.all([
      calculateQualificationEvaluatorDigest(repositoryRoot),
      calculateQualificationLogicalInputDigest({
        qualificationRoot,
        selection: options.selection,
      }),
      calculateQualificationLogicalInputDigest({
        qualificationRoot,
        selection: { adapterId: 'custom', implementationId: 'custom' },
      }),
    ]);

  return QualificationCompatibilityIdentitySchema.parse({
    version: 1,
    qualificationEvaluatorDigest,
    qualificationLogicalInputDigest,
    qualificationBaselineEvaluatorDigest: calculateBaselineEvaluatorDigest(
      qualificationEvaluatorDigest,
      customLogicalInputDigest,
    ),
  });
};
