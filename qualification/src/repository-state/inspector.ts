import { lstat, readFile, readlink } from 'node:fs/promises';
import { EXCLUDED_DIRECTORY_NAMES } from '../constants/index.ts';
import {
  calculateSha256,
  type IDirectoryFingerprintEntry,
  resolveContainedPath,
} from '../filesystem/index.ts';
import { executeProcess } from '../process/index.ts';
import type { IGitRepositoryState, IGitRepositoryStateOptions } from './types.ts';

const isMissingPathError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';

const isExcludedPath = (
  relativePath: string,
  excludedRelativePathPrefixes: readonly string[],
): boolean => {
  const pathSegments = relativePath.split('/');

  return (
    pathSegments.some((pathSegment) => EXCLUDED_DIRECTORY_NAMES.has(pathSegment)) ||
    excludedRelativePathPrefixes.some(
      (prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`),
    )
  );
};

const isIncludedPath = (
  relativePath: string,
  includedRelativePathPrefixes: readonly string[],
): boolean =>
  includedRelativePathPrefixes.length === 0 ||
  includedRelativePathPrefixes.some(
    (prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`),
  );

/** Extracts current and source paths from NUL-delimited porcelain status records. */
const extractStatusPaths = (statusOutput: string): string[] => {
  const records = statusOutput.split('\0');
  const paths: string[] = [];

  for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    const record = records[recordIndex];

    if (record === undefined || record === '') {
      continue;
    }

    const status = record.slice(0, 2);
    paths.push(record.slice(3));

    if (status.includes('R') || status.includes('C')) {
      const sourcePath = records[recordIndex + 1];

      if (sourcePath !== undefined && sourcePath !== '') {
        paths.push(sourcePath);
      }

      recordIndex += 1;
    }
  }

  return paths;
};

const collectGitFileEntry = async (
  repositoryRoot: string,
  relativePath: string,
): Promise<IDirectoryFingerprintEntry> => {
  const absolutePath = resolveContainedPath(repositoryRoot, relativePath);

  try {
    const stats = await lstat(absolutePath);

    if (stats.isSymbolicLink()) {
      return {
        path: relativePath,
        kind: 'symlink',
        mode: stats.mode,
        sha256: calculateSha256(await readlink(absolutePath)),
      };
    }

    if (!stats.isFile()) {
      return {
        path: relativePath,
        kind: 'file',
        mode: stats.mode,
        sha256: calculateSha256('<non-file-git-entry>'),
      };
    }

    return {
      path: relativePath,
      kind: 'file',
      mode: stats.mode,
      sha256: calculateSha256(await readFile(absolutePath)),
    };
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw error;
    }

    return {
      path: relativePath,
      kind: 'file',
      mode: 0,
      sha256: calculateSha256('<deleted>'),
    };
  }
};

/** Inspects one Git repository without reading ignored or excluded archive content. */
export const inspectGitRepositoryState = async (
  repositoryRoot: string,
  options: IGitRepositoryStateOptions = {},
): Promise<IGitRepositoryState> => {
  const [commitResult, filesResult, statusResult] = await Promise.all([
    executeProcess({
      command: 'git',
      args: ['rev-parse', 'HEAD'],
      cwd: repositoryRoot,
    }),
    executeProcess({
      command: 'git',
      args: ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      cwd: repositoryRoot,
    }),
    executeProcess({
      command: 'git',
      args: ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', '.'],
      cwd: repositoryRoot,
    }),
  ]);
  const excludedRelativePathPrefixes = options.excludedRelativePathPrefixes ?? [];
  const includedRelativePathPrefixes = options.includedRelativePathPrefixes ?? [];
  const relativePaths = filesResult.stdout
    .split('\0')
    .filter((relativePath) => relativePath !== '')
    .filter((relativePath) => isIncludedPath(relativePath, includedRelativePathPrefixes))
    .filter((relativePath) => !isExcludedPath(relativePath, excludedRelativePathPrefixes))
    .sort((left, right) => left.localeCompare(right, 'en'));
  const entries = await Promise.all(
    relativePaths.map((relativePath) => collectGitFileEntry(repositoryRoot, relativePath)),
  );
  const isDirty = extractStatusPaths(statusResult.stdout).some(
    (relativePath) =>
      isIncludedPath(relativePath, includedRelativePathPrefixes) &&
      !isExcludedPath(relativePath, excludedRelativePathPrefixes),
  );

  return {
    commit: commitResult.stdout.trim(),
    fingerprint: calculateSha256(`${JSON.stringify(entries)}\n`),
    isDirty,
    entries,
  };
};
