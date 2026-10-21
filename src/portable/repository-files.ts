import { lstat, realpath } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { getErrorCode } from 'jg-exception';
import { ERRORS as FS_ERRORS, isPathWithin, readBoundedFile } from 'jg-fs';

/**
 * Resolves a bounded regular file, optionally rejecting all directory links below the root.
 * @throws
 * - Expected a bounded regular file inside the repository.
 */
export const resolveRepositoryFile = async (
  repositoryRoot: string,
  filePath: string,
  maximumBytes: number,
  directoryLinks: 'allow' | 'reject' = 'allow',
): Promise<string> => {
  if (directoryLinks === 'reject') {
    if (!isPathWithin(repositoryRoot, filePath)) {
      throw new Error('Expected a bounded regular file inside the repository.');
    }
    let directoryPath = repositoryRoot;
    for (const component of relative(repositoryRoot, filePath).split(sep).slice(0, -1)) {
      directoryPath = join(directoryPath, component);
      if (!(await lstat(directoryPath)).isDirectory()) {
        throw new Error('Expected a bounded regular file inside the repository.');
      }
    }
  }
  const fileStat = await lstat(filePath);
  const resolvedPath = await realpath(filePath);
  if (
    !fileStat.isFile() ||
    fileStat.size > maximumBytes ||
    !isPathWithin(repositoryRoot, resolvedPath)
  ) {
    throw new Error('Expected a bounded regular file inside the repository.');
  }
  return resolvedPath;
};

/**
 * Reads at most the byte limit plus one detection byte, preserving the directory-link policy.
 * @throws
 * - Expected a bounded regular file inside the repository.
 * - Repository file exceeds its byte limit.
 */
export const readRepositoryFile = async (
  repositoryRoot: string,
  filePath: string,
  maximumBytes: number,
  directoryLinks: 'allow' | 'reject' = 'allow',
): Promise<Buffer> => {
  const resolvedPath = await resolveRepositoryFile(
    repositoryRoot,
    filePath,
    maximumBytes,
    directoryLinks,
  );
  try {
    return await readBoundedFile(resolvedPath, maximumBytes);
  } catch (error) {
    if (getErrorCode(error) === FS_ERRORS.FILE_TOO_LARGE)
      throw new Error('Repository file exceeds its byte limit.', { cause: error });
    if (getErrorCode(error) === FS_ERRORS.NOT_A_FILE)
      throw new Error('Expected a bounded regular file inside the repository.', { cause: error });
    throw error;
  }
};
