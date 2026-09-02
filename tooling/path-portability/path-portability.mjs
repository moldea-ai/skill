import { spawnSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { win32 } from 'node:path';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const MAXIMUM_COMPONENT_BYTES = 64;
const MAXIMUM_RELATIVE_PATH_BYTES = 160;
const WINDOWS_INVALID_CHARACTER_PATTERN = /[<>:"\\|?*\u0000-\u001f]/u;
const WINDOWS_RESERVED_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const TARGET_KEY_PATTERN = /^t[1-9][0-9]*$/u;
const CASE_KEY_PATTERN = /^c[1-9][0-9]*$/u;
const ATTEMPT_KEY_PATTERN = /^a-[a-f0-9]{32}$/u;
const ARTIFACT_KEY_PATTERN = /^f[1-9][0-9]*(?:\.[a-z0-9]+)?$/u;

const getPathBytes = (source) => Buffer.byteLength(source, 'utf8');

/** Returns whether a repository-relative path enters a hard-excluded directory. */
export const hasExcludedDirectory = (relativePath) =>
  relativePath.split('/').some((component) => EXCLUDED_DIRECTORY_NAMES.has(component));

/**
 * Validates one implementation-controlled path against the cross-platform repository budget.
 * @param relativePath Repository-relative POSIX path.
 * @throws If the path is unsafe, non-portable, or exceeds a byte budget.
 */
export const assertPortableRepositoryPath = (relativePath) => {
  if (
    typeof relativePath !== 'string' ||
    relativePath === '' ||
    relativePath.includes('\0') ||
    relativePath.includes('\\') ||
    relativePath.startsWith('/') ||
    win32.isAbsolute(relativePath) ||
    relativePath.includes('\ufffd')
  ) {
    throw new Error(`Repository path is not a contained POSIX path: ${String(relativePath)}`);
  }

  const components = relativePath.split('/');

  for (const component of components) {
    if (component === '' || component === '.' || component === '..') {
      throw new Error(`Repository path contains a traversal component: ${relativePath}`);
    }
    if (
      WINDOWS_INVALID_CHARACTER_PATTERN.test(component) ||
      component.endsWith('.') ||
      component.endsWith(' ') ||
      WINDOWS_RESERVED_NAME_PATTERN.test(component)
    ) {
      throw new Error(`Repository path contains a Windows-incompatible component: ${relativePath}`);
    }
    if (getPathBytes(component) > MAXIMUM_COMPONENT_BYTES) {
      throw new Error(
        `Repository path component exceeds ${MAXIMUM_COMPONENT_BYTES} UTF-8 bytes: ${relativePath}`,
      );
    }
  }

  if (getPathBytes(relativePath) > MAXIMUM_RELATIVE_PATH_BYTES) {
    throw new Error(
      `Repository path exceeds ${MAXIMUM_RELATIVE_PATH_BYTES} UTF-8 bytes: ${relativePath}`,
    );
  }
};

/** Rejects repository paths that collide on a case-insensitive normalized filesystem. */
export const assertNoWindowsCaseFoldCollisions = (relativePaths) => {
  const originalByFoldedPath = new Map();

  for (const relativePath of relativePaths) {
    const foldedPath = relativePath.normalize('NFC').toLocaleLowerCase('en-US');
    const existingPath = originalByFoldedPath.get(foldedPath);

    if (existingPath !== undefined && existingPath !== relativePath) {
      throw new Error(`Repository paths collide on Windows: ${existingPath} and ${relativePath}`);
    }

    originalByFoldedPath.set(foldedPath, relativePath);
  }
};

/** Validates the short profile and result keys represented by one tracked candidate path. */
export const assertQualificationStoragePath = (relativePath) => {
  const components = relativePath.split('/');

  if (components[0] !== 'qualification') return;

  if (components[1] === 'profiles' && components[2] !== undefined) {
    if (components[2] === 'index.yaml') return;

    if (!TARGET_KEY_PATTERN.test(components[2])) {
      throw new Error(`Qualification profile path has an invalid target key: ${relativePath}`);
    }

    if (
      components[3] === 'cases' &&
      (components[4] === undefined || !CASE_KEY_PATTERN.test(components[4]))
    ) {
      throw new Error(`Qualification profile path has an invalid case key: ${relativePath}`);
    }
    return;
  }

  if (components[1] !== 'results' || components[2] === undefined) return;
  if (components[2] === 'README.md') return;

  if (!TARGET_KEY_PATTERN.test(components[2])) {
    throw new Error(`Qualification result path has an invalid target key: ${relativePath}`);
  }

  if (components.length === 4 && components[3] === 'latest.json') return;

  if (
    components[3] !== 'attempts' ||
    components[4] === undefined ||
    !ATTEMPT_KEY_PATTERN.test(components[4])
  ) {
    throw new Error(`Qualification result path has an invalid attempt key: ${relativePath}`);
  }

  if (
    components.length === 6 &&
    (components[5] === 'attempt.json' || components[5] === 'storage.json')
  ) {
    return;
  }

  if (
    components.length === 7 &&
    components[5] === 'artifacts' &&
    components[6] !== undefined &&
    ARTIFACT_KEY_PATTERN.test(components[6])
  ) {
    return;
  }

  throw new Error(`Qualification result path does not use short storage: ${relativePath}`);
};

const runGit = (repositoryRoot, args) => {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });

  if (result.error !== undefined || result.status !== 0) {
    const detail = result.stderr?.toString('utf8').trim();
    throw new Error(
      `Git ${args[0] ?? 'command'} failed${detail ? `: ${detail}` : '.'}`,
      result.error === undefined ? undefined : { cause: result.error },
    );
  }

  return result.stdout ?? Buffer.alloc(0);
};

/** Lists tracked and non-ignored candidate files without opening repository contents. */
export const listCandidateRepositoryPaths = (repositoryRoot) =>
  runGit(repositoryRoot, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .toString('utf8')
    .split('\0')
    .filter((relativePath) => relativePath !== '' && !hasExcludedDirectory(relativePath))
    .sort((left, right) => left.localeCompare(right, 'en'));

/** Returns representative maximum generated short-storage paths for future result writers. */
export const createWorstCaseQualificationPaths = () => {
  const maximumNumericKey = String(Number.MAX_SAFE_INTEGER);
  const targetKey = `t${maximumNumericKey}`;
  const attemptKey = `a-${'f'.repeat(32)}`;
  const artifactKeyPrefix = `f${maximumNumericKey}.`;
  const maximumArtifactKey = `${artifactKeyPrefix}${'x'.repeat(
    MAXIMUM_COMPONENT_BYTES - artifactKeyPrefix.length,
  )}`;

  return [
    `qualification/profiles/${targetKey}/cases/c${maximumNumericKey}/scenario.yaml`,
    `qualification/results/${targetKey}/attempts/${attemptKey}/attempt.json`,
    `qualification/results/${targetKey}/attempts/${attemptKey}/storage.json`,
    `qualification/results/${targetKey}/attempts/${attemptKey}/artifacts/${maximumArtifactKey}`,
  ];
};

/**
 * Validates current candidate paths, short-storage keys, case folding, and generated path headroom.
 * @param repositoryRoot Git repository root.
 * @returns Audited path count and longest repository-relative byte length.
 */
export const checkRepositoryPathPortability = (repositoryRoot) => {
  const candidatePaths = listCandidateRepositoryPaths(repositoryRoot);
  const auditedPaths = [...candidatePaths, ...createWorstCaseQualificationPaths()];

  for (const relativePath of auditedPaths) {
    assertPortableRepositoryPath(relativePath);
    assertQualificationStoragePath(relativePath);
  }

  assertNoWindowsCaseFoldCollisions(candidatePaths);
  const maximumPathBytes = auditedPaths.reduce(
    (maximumBytes, relativePath) => Math.max(maximumBytes, getPathBytes(relativePath)),
    0,
  );

  return { maximumPathBytes, pathCount: candidatePaths.length };
};
