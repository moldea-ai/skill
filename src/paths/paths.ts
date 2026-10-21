import { Buffer } from 'node:buffer';
import { listUntrackedFiles, readIndexEntries } from 'jg-git-commands';
import { findCaseFoldCollision, isPortablePathValid } from 'jg-utilities';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);
const MAXIMUM_COMPONENT_BYTES = 64;
const MAXIMUM_RELATIVE_PATH_BYTES = 160;
// bytes each Git path listing may take (64 MiB)
const MAXIMUM_GIT_LISTING_BYTES = 67_108_864;

const getPathBytes = (source: string): number => Buffer.byteLength(source, 'utf8');

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
    !isPortablePathValid(relativePath, {
      maxComponentBytes: MAXIMUM_COMPONENT_BYTES,
      maxPathBytes: MAXIMUM_RELATIVE_PATH_BYTES,
    })
  ) {
    throw new Error(
      `Repository path is not portable to Windows, macOS and Linux within ${MAXIMUM_COMPONENT_BYTES} UTF-8 bytes per component and ${MAXIMUM_RELATIVE_PATH_BYTES} in total: ${String(relativePath)}`,
    );
  }
};

/** Rejects repository paths that collide on a case-insensitive normalized filesystem. */
export const assertNoWindowsCaseFoldCollisions = (relativePaths: readonly string[]): void => {
  const collision = findCaseFoldCollision(relativePaths);

  if (collision !== null) {
    throw new Error(`Repository paths collide on Windows: ${collision[0]} and ${collision[1]}`);
  }
};

/** Lists tracked and non-ignored candidate files without opening repository contents. */
export const listCandidateRepositoryPaths = async (repositoryRoot: string): Promise<string[]> => {
  const options = { maxOutputBytes: MAXIMUM_GIT_LISTING_BYTES };
  const [entries, untrackedPaths] = await Promise.all([
    readIndexEntries(repositoryRoot, options),
    listUntrackedFiles(repositoryRoot, options),
  ]);

  return [...new Set([...entries.map(({ path }) => path), ...untrackedPaths])]
    .filter((relativePath) => !hasExcludedDirectory(relativePath))
    .sort((left, right) => left.localeCompare(right, 'en'));
};

/**
 * Validates current candidate paths and case folding.
 * @param repositoryRoot Git repository root.
 * @returns A promise that resolves to the audited path count and longest repository-relative
 * byte length.
 */
export const checkRepositoryPathPortability = async (
  repositoryRoot: string,
): Promise<{ maximumPathBytes: number; pathCount: number }> => {
  const candidatePaths = await listCandidateRepositoryPaths(repositoryRoot);

  for (const relativePath of candidatePaths) {
    assertPortableRepositoryPath(relativePath);
  }

  assertNoWindowsCaseFoldCollisions(candidatePaths);
  const maximumPathBytes = candidatePaths.reduce(
    (maximumBytes, relativePath) => Math.max(maximumBytes, getPathBytes(relativePath)),
    0,
  );

  return { maximumPathBytes, pathCount: candidatePaths.length };
};
