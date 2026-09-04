import { execFile } from 'node:child_process';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';

import { QUALIFICATION_ROOT, SKILL_REPOSITORY_ROOT } from '../constants/index.ts';
import {
  QualificationCaseCatalogSchema,
  QualificationProfileSchema,
  type IQualificationProfile,
  type IQualificationSelection,
} from '../contracts/index.ts';
import {
  calculateSha256,
  collectDirectoryFingerprintEntries,
  resolveContainedPath,
} from '../filesystem/index.ts';
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
import { QualificationProfileIndexSchema } from '../storage/types.ts';
import {
  QualificationCompatibilityIdentitySchema,
  QualificationLogicalInputBundleSchema,
  type IQualificationCompatibilityIdentity,
  type IQualificationLogicalInputBundle,
  type IQualificationLogicalSourceEntry,
} from './types.ts';

const executeFile = promisify(execFile);
const MAXIMUM_IDENTITY_ENTRY_COUNT = 4096;
const MAXIMUM_IDENTITY_FILE_BYTES = 16 * 1024 * 1024;
const GIT_COMMIT_PATTERN = /^[a-f0-9]{40}$/u;
const TYPE_DECLARATION_FILE_PATTERN = /\.d\.[^/]+$/u;
const PROFILE_DOCUMENTATION_PATH = 'README.md';
const QUALIFICATION_CASE_CATALOG_PATH = 'qualification/cases/cases.yaml';
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
  'qualification/src/result/contract-reader.ts',
  'qualification/src/result/evidence.ts',
  'qualification/src/result/recorder.ts',
  'qualification/src/result/index.ts',
]);

type IGitTreeEntry = {
  mode: '100644' | '100755' | '120000';
  objectId: string;
  path: string;
};

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

const getDefaultRoots = (repositoryRoot: string = SKILL_REPOSITORY_ROOT): IIdentityRoots => ({
  qualificationRoot: path.join(repositoryRoot, 'qualification'),
  repositoryRoot,
});

const normalizeFilesystemMode = (
  kind: 'file' | 'symlink',
  mode: number,
): IQualificationLogicalSourceEntry['mode'] => {
  if (kind === 'symlink') {
    return '120000';
  }
  return (mode & 0o111) === 0 ? '100644' : '100755';
};

const assertBoundedEntries = (entries: readonly unknown[], label: string): void => {
  if (entries.length > MAXIMUM_IDENTITY_ENTRY_COUNT) {
    throw new Error(`${label} exceeds the supported identity entry count.`);
  }
};

const runGit = async (repositoryRoot: string, arguments_: readonly string[]): Promise<Buffer> => {
  const { stdout } = await executeFile('git', [...arguments_], {
    cwd: repositoryRoot,
    encoding: 'buffer',
    maxBuffer: MAXIMUM_IDENTITY_FILE_BYTES,
  });

  return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout);
};

const parseGitTreeEntries = (source: Buffer): IGitTreeEntry[] => {
  const entries = source
    .toString('utf8')
    .split('\0')
    .filter((record) => record !== '')
    .map<IGitTreeEntry>((record) => {
      const separatorIndex = record.indexOf('\t');
      const [candidateMode, objectType, objectId] = record.slice(0, separatorIndex).split(' ');
      const relativePath = record.slice(separatorIndex + 1);

      if (
        separatorIndex === -1 ||
        (candidateMode !== '100644' && candidateMode !== '100755' && candidateMode !== '120000') ||
        objectType !== 'blob' ||
        objectId === undefined ||
        relativePath === ''
      ) {
        throw new Error('Qualification identity Git tree contains an unsupported entry.');
      }

      return {
        mode: candidateMode,
        objectId,
        path: relativePath,
      };
    });

  assertBoundedEntries(entries, 'Qualification identity Git tree');
  return entries;
};

const listGitTreeEntries = async (
  repositoryRoot: string,
  commit: string,
  pathPrefixes: readonly string[],
): Promise<IGitTreeEntry[]> => {
  if (!GIT_COMMIT_PATTERN.test(commit)) {
    throw new Error('Qualification compatibility identity requires an exact Git commit.');
  }

  return parseGitTreeEntries(
    await runGit(repositoryRoot, ['ls-tree', '-r', '-z', commit, '--', ...pathPrefixes]),
  );
};

const readGitBlob = async (
  repositoryRoot: string,
  commit: string,
  relativePath: string,
): Promise<Buffer> => {
  const content = await runGit(repositoryRoot, ['cat-file', 'blob', `${commit}:${relativePath}`]);

  if (content.byteLength > MAXIMUM_IDENTITY_FILE_BYTES) {
    throw new Error(`Qualification identity file is too large: ${relativePath}`);
  }

  return content;
};

const readOptionalGitBlob = async (
  repositoryRoot: string,
  commit: string,
  relativePath: string,
): Promise<Buffer | null> => {
  const matchingEntries = (await listGitTreeEntries(repositoryRoot, commit, [relativePath])).filter(
    ({ path: candidatePath }) => candidatePath === relativePath,
  );

  if (matchingEntries.length === 0) {
    return null;
  }

  if (matchingEntries.length !== 1) {
    throw new Error(`Qualification identity has an ambiguous Git path: ${relativePath}`);
  }

  return readGitBlob(repositoryRoot, commit, relativePath);
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

/** Returns whether version 1 treats one repository path as evaluator-bearing source. */
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

  const [qualificationEntries, hostEntries, candidateEntries] = await Promise.all([
    collectSourceEntries(
      path.join(roots.qualificationRoot, 'src'),
      'qualification/src',
      isQualificationEvaluatorSourcePath,
    ),
    collectSourceEntries(
      path.join(roots.repositoryRoot, 'tooling/codex-evaluation-host'),
      'tooling/codex-evaluation-host',
      (relativePath) =>
        isQualificationBehaviorBearingSourcePath(
          relativePath.slice('tooling/codex-evaluation-host/'.length),
        ),
    ),
    collectSourceEntries(
      path.join(roots.repositoryRoot, 'tooling/package-candidate'),
      'tooling/package-candidate',
      (relativePath) =>
        isQualificationBehaviorBearingSourcePath(
          relativePath.slice('tooling/package-candidate/'.length),
        ),
    ),
  ]);
  const qualificationManifestPath = path.join(
    roots.repositoryRoot,
    QUALIFICATION_PACKAGE_MANIFEST_PATH,
  );
  const qualificationLockPath = path.join(roots.repositoryRoot, QUALIFICATION_PACKAGE_LOCK_PATH);
  const toolingManifestPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_MANIFEST_PATH);
  const toolingLockPath = path.join(roots.repositoryRoot, TOOLING_PACKAGE_LOCK_PATH);
  const [qualificationManifest, qualificationLock, toolingManifest, toolingLock] =
    await Promise.all([
      readFile(qualificationManifestPath, 'utf8'),
      readFile(qualificationLockPath, 'utf8'),
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
    lstat(qualificationLockPath).then((stats) =>
      createNormalizedEntry(
        QUALIFICATION_PACKAGE_LOCK_PATH,
        normalizeFilesystemMode('file', stats.mode),
        normalizeQualificationRuntimePackageLock(JSON.parse(qualificationLock) as unknown),
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

  return [...qualificationEntries, ...hostEntries, ...candidateEntries, ...normalizedEntries].sort(
    (left, right) => left.path.localeCompare(right.path, 'en'),
  );
};

const createGitEvaluatorEntries = async (
  repositoryRoot: string,
  commit: string,
): Promise<IQualificationLogicalSourceEntry[]> => {
  const treeEntries = await listGitTreeEntries(repositoryRoot, commit, [
    'qualification/src',
    'tooling/codex-evaluation-host',
    'tooling/package-candidate',
    QUALIFICATION_PACKAGE_MANIFEST_PATH,
    QUALIFICATION_PACKAGE_LOCK_PATH,
    TOOLING_PACKAGE_MANIFEST_PATH,
    TOOLING_PACKAGE_LOCK_PATH,
  ]);
  const sourceEntries = treeEntries.filter(({ path: relativePath }) => {
    if (relativePath.startsWith('qualification/src/')) {
      return isQualificationEvaluatorSourcePath(relativePath);
    }
    if (relativePath.startsWith('tooling/codex-evaluation-host/')) {
      return isQualificationBehaviorBearingSourcePath(
        relativePath.slice('tooling/codex-evaluation-host/'.length),
      );
    }
    if (relativePath.startsWith('tooling/package-candidate/')) {
      return isQualificationBehaviorBearingSourcePath(
        relativePath.slice('tooling/package-candidate/'.length),
      );
    }
    return false;
  });
  const entries = await Promise.all(
    sourceEntries.map(async ({ mode, path: relativePath }) =>
      createLogicalEntry(
        relativePath,
        mode,
        await readGitBlob(repositoryRoot, commit, relativePath),
      ),
    ),
  );
  const requiredInputs = new Map(
    treeEntries
      .filter(({ path: relativePath }) =>
        [
          QUALIFICATION_PACKAGE_MANIFEST_PATH,
          QUALIFICATION_PACKAGE_LOCK_PATH,
          TOOLING_PACKAGE_MANIFEST_PATH,
          TOOLING_PACKAGE_LOCK_PATH,
        ].includes(relativePath),
      )
      .map((entry) => [entry.path, entry]),
  );

  for (const requiredPath of [
    QUALIFICATION_PACKAGE_MANIFEST_PATH,
    QUALIFICATION_PACKAGE_LOCK_PATH,
    TOOLING_PACKAGE_MANIFEST_PATH,
    TOOLING_PACKAGE_LOCK_PATH,
  ]) {
    if (!requiredInputs.has(requiredPath)) {
      throw new Error(`Qualification evaluator identity is missing ${requiredPath}.`);
    }
  }

  const qualificationManifest = JSON.parse(
    (await readGitBlob(repositoryRoot, commit, QUALIFICATION_PACKAGE_MANIFEST_PATH)).toString(
      'utf8',
    ),
  ) as unknown;
  const qualificationLock = JSON.parse(
    (await readGitBlob(repositoryRoot, commit, QUALIFICATION_PACKAGE_LOCK_PATH)).toString('utf8'),
  ) as unknown;
  const toolingManifest = JSON.parse(
    (await readGitBlob(repositoryRoot, commit, TOOLING_PACKAGE_MANIFEST_PATH)).toString('utf8'),
  ) as unknown;
  const toolingLock = JSON.parse(
    (await readGitBlob(repositoryRoot, commit, TOOLING_PACKAGE_LOCK_PATH)).toString('utf8'),
  ) as unknown;
  entries.push(
    createNormalizedEntry(
      QUALIFICATION_PACKAGE_MANIFEST_PATH,
      requiredInputs.get(QUALIFICATION_PACKAGE_MANIFEST_PATH)!.mode,
      normalizeQualificationRuntimePackageManifest(qualificationManifest),
    ),
    createNormalizedEntry(
      QUALIFICATION_PACKAGE_LOCK_PATH,
      requiredInputs.get(QUALIFICATION_PACKAGE_LOCK_PATH)!.mode,
      normalizeQualificationRuntimePackageLock(qualificationLock),
    ),
    createNormalizedEntry(
      TOOLING_PACKAGE_MANIFEST_PATH,
      requiredInputs.get(TOOLING_PACKAGE_MANIFEST_PATH)!.mode,
      normalizeQualificationToolingPackageManifest(
        toolingManifest,
        QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
      ),
    ),
    createNormalizedEntry(
      TOOLING_PACKAGE_LOCK_PATH,
      requiredInputs.get(TOOLING_PACKAGE_LOCK_PATH)!.mode,
      normalizeQualificationToolingPackageLock(
        toolingLock,
        QUALIFICATION_SHARED_TOOLING_PACKAGE_NAMES,
      ),
    ),
  );

  return entries.sort((left, right) => left.path.localeCompare(right.path, 'en'));
};

/** Calculates the version-1 evaluator digest from the current filesystem. */
export const calculateQualificationEvaluatorDigest = async (
  repositoryRoot: string = SKILL_REPOSITORY_ROOT,
): Promise<string> =>
  calculateSha256(
    `${JSON.stringify(await createCurrentEvaluatorEntries(getDefaultRoots(repositoryRoot)))}\n`,
  );

/** Calculates the version-1 evaluator digest from one immutable Git tree. */
export const calculateQualificationEvaluatorDigestAtCommit = async (
  commit: string,
  repositoryRoot: string = SKILL_REPOSITORY_ROOT,
): Promise<string> =>
  calculateSha256(`${JSON.stringify(await createGitEvaluatorEntries(repositoryRoot, commit))}\n`);

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
  caseCatalogSource: string;
  profileRelativeDirectory: string;
  profileSource: IProfileSource;
  selection: IQualificationSelection;
}): Promise<IQualificationLogicalInputBundle> => {
  const profile = QualificationProfileSchema.parse(
    parseYaml(
      await options.profileSource.readProfileFile(options.profileRelativeDirectory, 'profile.yaml'),
    ) as unknown,
  );

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
  const caseCatalog = QualificationCaseCatalogSchema.parse(
    parseYaml(options.caseCatalogSource) as unknown,
  );
  const catalogIds = new Set(caseCatalog.cases.map(({ id }) => id));
  const unknownCaseIds = caseIds.filter((caseId) => !catalogIds.has(caseId));

  if (unknownCaseIds.length > 0) {
    throw new Error('Qualification logical profile does not match the canonical case catalog.');
  }

  const physicalEntries = await options.profileSource.listEntries(options.profileRelativeDirectory);
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
      version: caseCatalog.version,
      cases: caseCatalog.cases.filter(({ id }) => caseIds.includes(id)),
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
    caseCatalogSource: await readFile(path.join(qualificationRoot, 'cases', 'cases.yaml'), 'utf8'),
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

/** Creates one canonical logical target bundle from an expanded or short immutable Git tree. */
export const createQualificationLogicalInputBundleAtCommit = async (options: {
  commit: string;
  repositoryRoot?: string;
  selection: IQualificationSelection;
}): Promise<IQualificationLogicalInputBundle> => {
  const repositoryRoot = options.repositoryRoot ?? SKILL_REPOSITORY_ROOT;
  const indexSource = await readOptionalGitBlob(
    repositoryRoot,
    options.commit,
    'qualification/profiles/index.yaml',
  );
  let profileRelativeDirectory: string;

  if (indexSource === null) {
    profileRelativeDirectory = path.posix.join(
      options.selection.adapterId,
      options.selection.implementationId,
    );
  } else {
    const parsedIndex = QualificationProfileIndexSchema.parse(
      parseYaml(indexSource.toString('utf8')) as unknown,
    );
    const target = findQualificationProfileTarget(parsedIndex, options.selection);
    if (target === null) {
      throw new Error('Immutable qualification profile index does not contain the selection.');
    }
    profileRelativeDirectory = target.key;
  }

  const repositoryProfileDirectory = path.posix.join(
    'qualification/profiles',
    profileRelativeDirectory,
  );
  const profileEntries = await listGitTreeEntries(repositoryRoot, options.commit, [
    repositoryProfileDirectory,
  ]);

  return createLogicalInputBundle({
    caseCatalogSource: (
      await readGitBlob(repositoryRoot, options.commit, QUALIFICATION_CASE_CATALOG_PATH)
    ).toString('utf8'),
    profileRelativeDirectory,
    profileSource: {
      listEntries: async () =>
        Promise.all(
          profileEntries.map(async (entry) => ({
            path: entry.path.slice(repositoryProfileDirectory.length + 1),
            kind: entry.mode === '120000' ? ('symlink' as const) : ('file' as const),
            mode: entry.mode,
            sha256: calculateSha256(await readGitBlob(repositoryRoot, options.commit, entry.path)),
          })),
        ),
      readProfileFile: async (_profileRelativeDirectory, relativePath) =>
        (
          await readGitBlob(
            repositoryRoot,
            options.commit,
            path.posix.join(repositoryProfileDirectory, relativePath),
          )
        ).toString('utf8'),
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

/** Calculates one target's canonical logical-input digest from an immutable Git tree. */
export const calculateQualificationLogicalInputDigestAtCommit = async (options: {
  commit: string;
  repositoryRoot?: string;
  selection: IQualificationSelection;
}): Promise<string> =>
  calculateSha256(
    `${JSON.stringify(await createQualificationLogicalInputBundleAtCommit(options))}\n`,
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

/** Creates all qualification compatibility identities from one immutable Git tree. */
export const createQualificationCompatibilityIdentityAtCommit = async (options: {
  commit: string;
  repositoryRoot?: string;
  selection: IQualificationSelection;
}): Promise<IQualificationCompatibilityIdentity> => {
  const repositoryRoot = options.repositoryRoot ?? SKILL_REPOSITORY_ROOT;
  const [qualificationEvaluatorDigest, qualificationLogicalInputDigest, customLogicalInputDigest] =
    await Promise.all([
      calculateQualificationEvaluatorDigestAtCommit(options.commit, repositoryRoot),
      calculateQualificationLogicalInputDigestAtCommit({ ...options, repositoryRoot }),
      calculateQualificationLogicalInputDigestAtCommit({
        commit: options.commit,
        repositoryRoot,
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
