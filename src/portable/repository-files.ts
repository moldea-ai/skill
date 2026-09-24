import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';

/** Returns whether a resolved path remains within the trusted root. */
export const isPathWithin = (trustedRoot: string, candidatePath: string): boolean => {
  const path = relative(trustedRoot, candidatePath);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
};

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
  const file = await open(resolvedPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maximumBytes) {
      throw new Error('Expected a bounded regular file inside the repository.');
    }
    const chunks: Buffer[] = [];
    let total = 0;
    while (total <= maximumBytes) {
      const bytes = Buffer.allocUnsafe(
        Math.min(
          65_536,
          total === 0 ? Math.max(1, stat.size + 1) : 65_536,
          maximumBytes + 1 - total,
        ),
      );
      const { bytesRead } = await file.read(bytes, 0, bytes.length, null);
      if (bytesRead === 0) return Buffer.concat(chunks, total);
      total += bytesRead;
      if (total > maximumBytes) break;
      chunks.push(bytes.subarray(0, bytesRead));
    }
    throw new Error('Repository file exceeds its byte limit.');
  } finally {
    await file.close();
  }
};
