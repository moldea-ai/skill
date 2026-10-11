import { spawnSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { win32 } from 'node:path';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const MAXIMUM_COMPONENT_BYTES = 64;
const MAXIMUM_RELATIVE_PATH_BYTES = 160;
const WINDOWS_INVALID_CHARACTER_PATTERN = /[<>:"\\|?*]/u;
const WINDOWS_RESERVED_NAME_PATTERN = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;

const getPathBytes = (source: string): number => Buffer.byteLength(source, 'utf8');

const hasControlCharacter = (source: string): boolean => {
  for (const character of source) {
    if (character.charCodeAt(0) <= 0x1f) return true;
  }
  return false;
};

/** Returns whether a repository-relative path enters a hard-excluded directory. */
export const hasExcludedDirectory = (relativePath: string): boolean =>
  relativePath.split('/').some((component) => EXCLUDED_DIRECTORY_NAMES.has(component));

/**
 * Validates one implementation-controlled path against the cross-platform repository budget.
 * @param relativePath Repository-relative POSIX path.
 * @throws If the path is unsafe, non-portable, or exceeds a byte budget.
 */
export const assertPortableRepositoryPath = (relativePath: string): void => {
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
      hasControlCharacter(component) ||
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
export const assertNoWindowsCaseFoldCollisions = (relativePaths: readonly string[]): void => {
  const originalByFoldedPath = new Map<string, string>();

  for (const relativePath of relativePaths) {
    const foldedPath = relativePath.normalize('NFC').toLocaleLowerCase('en-US');
    const existingPath = originalByFoldedPath.get(foldedPath);

    if (existingPath !== undefined && existingPath !== relativePath) {
      throw new Error(`Repository paths collide on Windows: ${existingPath} and ${relativePath}`);
    }

    originalByFoldedPath.set(foldedPath, relativePath);
  }
};

const runGit = (repositoryRoot: string, args: readonly string[]): Buffer => {
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
export const listCandidateRepositoryPaths = (repositoryRoot: string): string[] =>
  runGit(repositoryRoot, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .toString('utf8')
    .split('\0')
    .filter((relativePath) => relativePath !== '' && !hasExcludedDirectory(relativePath))
    .sort((left, right) => left.localeCompare(right, 'en'));

/**
 * Validates current candidate paths and case folding.
 * @param repositoryRoot Git repository root.
 * @returns Audited path count and longest repository-relative byte length.
 */
export const checkRepositoryPathPortability = (
  repositoryRoot: string,
): { maximumPathBytes: number; pathCount: number } => {
  const candidatePaths = listCandidateRepositoryPaths(repositoryRoot);
  const auditedPaths = candidatePaths;

  for (const relativePath of auditedPaths) {
    assertPortableRepositoryPath(relativePath);
  }

  assertNoWindowsCaseFoldCollisions(candidatePaths);
  const maximumPathBytes = auditedPaths.reduce(
    (maximumBytes, relativePath) => Math.max(maximumBytes, getPathBytes(relativePath)),
    0,
  );

  return { maximumPathBytes, pathCount: candidatePaths.length };
};
