import { createHash, randomUUID } from 'node:crypto';
import { constants as filesystemConstants } from 'node:fs';
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import { EXCLUDED_DIRECTORY_NAMES } from '../constants/index.ts';
import type {
  IBoundarySchema,
  IDirectoryFingerprintEntry,
  IDirectoryTraversalOptions,
} from './types.ts';

const comparePaths = (left: string, right: string): number => left.localeCompare(right, 'en');

const isExcludedRelativePath = (
  relativePath: string,
  excludedRelativePathPrefixes: readonly string[],
): boolean =>
  excludedRelativePathPrefixes.some(
    (prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`),
  );

/** Calculates a lowercase SHA-256 digest for exact bytes. */
export const calculateSha256 = (content: string | Uint8Array): string =>
  createHash('sha256').update(content).digest('hex');

/** Creates a directory and every missing parent without changing existing content. */
export const ensureDirectory = async (directoryPath: string): Promise<void> => {
  await mkdir(directoryPath, { recursive: true });
};

/** Resolves and validates a repository-relative path below one trusted root. */
export const resolveContainedPath = (rootDirectory: string, relativePath: string): string => {
  const resolvedRoot = path.resolve(rootDirectory);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relativeToRoot = path.relative(resolvedRoot, resolvedPath);

  if (
    relativeToRoot === '' ||
    (!relativeToRoot.startsWith('..') && !path.isAbsolute(relativeToRoot))
  ) {
    return resolvedPath;
  }

  throw new Error(`Path escapes its qualification root: ${relativePath}`);
};

/** Reads and validates one UTF-8 JSON document at a trusted local path. */
export const readJsonFile = async <TResult>(
  filePath: string,
  schema: IBoundarySchema<TResult>,
): Promise<TResult> => {
  const source = await readFile(filePath, 'utf8');
  return schema.parse(JSON.parse(source) as unknown);
};

/** Reads and validates one UTF-8 YAML document at a trusted local path. */
export const readYamlFile = async <TResult>(
  filePath: string,
  schema: IBoundarySchema<TResult>,
): Promise<TResult> => {
  const source = await readFile(filePath, 'utf8');
  return schema.parse(parseYaml(source) as unknown);
};

/** Writes exact text through a same-directory atomic rename. */
export const writeTextFileAtomically = async (filePath: string, content: string): Promise<void> => {
  await ensureDirectory(path.dirname(filePath));
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;

  try {
    await writeFile(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, filePath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
};

/** Serializes a readable JSON artifact and commits it atomically. */
export const writeJsonFileAtomically = async (
  filePath: string,
  content: unknown,
): Promise<void> => {
  await writeTextFileAtomically(filePath, `${JSON.stringify(content, null, 2)}\n`);
};

/** Returns the SHA-256 digest of one regular file without interpreting its content. */
export const calculateFileSha256 = async (filePath: string): Promise<string> =>
  calculateSha256(await readFile(filePath));

/**
 * Lists regular files and symlinks without following links or entering excluded directories.
 * @returns A promise resolving to stable POSIX-relative paths.
 */
export const listDirectoryFiles = async (
  rootDirectory: string,
  options: IDirectoryTraversalOptions = {},
): Promise<string[]> => {
  const discoveredPaths: string[] = [];
  const excludedDirectoryNames = new Set([
    ...EXCLUDED_DIRECTORY_NAMES,
    ...(options.excludedDirectoryNames ?? []),
  ]);
  const excludedRelativePathPrefixes = options.excludedRelativePathPrefixes ?? [];

  const visitDirectory = async (
    directoryPath: string,
    relativeDirectory: string,
  ): Promise<void> => {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    entries.sort((left, right) => comparePaths(left.name, right.name));

    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);

      if (isExcludedRelativePath(relativePath, excludedRelativePathPrefixes)) {
        continue;
      }

      const absolutePath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        if (!excludedDirectoryNames.has(entry.name)) {
          await visitDirectory(absolutePath, relativePath);
        }
        continue;
      }

      if (entry.isFile() || entry.isSymbolicLink()) {
        discoveredPaths.push(relativePath);
      }
    }
  };

  await visitDirectory(path.resolve(rootDirectory), '');
  return discoveredPaths;
};

/** Builds stable file, mode, and symlink-target evidence for one directory tree. */
export const collectDirectoryFingerprintEntries = async (
  rootDirectory: string,
  options: IDirectoryTraversalOptions = {},
): Promise<IDirectoryFingerprintEntry[]> => {
  const relativePaths = await listDirectoryFiles(rootDirectory, options);

  return Promise.all(
    relativePaths.map(async (relativePath) => {
      const absolutePath = resolveContainedPath(rootDirectory, relativePath);
      const stats = await lstat(absolutePath);

      if (stats.isSymbolicLink()) {
        return {
          path: relativePath,
          kind: 'symlink' as const,
          mode: stats.mode,
          sha256: calculateSha256(await readlink(absolutePath)),
        };
      }

      return {
        path: relativePath,
        kind: 'file' as const,
        mode: stats.mode,
        sha256: await calculateFileSha256(absolutePath),
      };
    }),
  );
};

/** Calculates a content, mode, path, and symlink-sensitive directory fingerprint. */
export const calculateDirectoryFingerprint = async (
  rootDirectory: string,
  options: IDirectoryTraversalOptions = {},
): Promise<string> => {
  const entries = await collectDirectoryFingerprintEntries(rootDirectory, options);
  return calculateSha256(`${JSON.stringify(entries)}\n`);
};

/** Copies one transparent fixture tree while preserving symlinks and mandatory exclusions. */
export const copyDirectory = async (
  sourceDirectory: string,
  destinationDirectory: string,
  options: IDirectoryTraversalOptions = {},
): Promise<void> => {
  const resolvedSource = path.resolve(sourceDirectory);
  const relativePaths = await listDirectoryFiles(resolvedSource, options);

  await ensureDirectory(destinationDirectory);

  for (const relativePath of relativePaths) {
    const sourcePath = resolveContainedPath(resolvedSource, relativePath);
    const destinationPath = resolveContainedPath(destinationDirectory, relativePath);
    const stats = await lstat(sourcePath);

    await ensureDirectory(path.dirname(destinationPath));

    if (stats.isSymbolicLink()) {
      if (options.overwrite === true) {
        await rm(destinationPath, { force: true, recursive: true });
      }

      await symlink(await readlink(sourcePath), destinationPath);
      continue;
    }

    await copyFile(
      sourcePath,
      destinationPath,
      options.overwrite === true ? 0 : filesystemConstants.COPYFILE_EXCL,
    );
  }
};

/** Copies one file after creating its destination directory. */
export const copyFileWithParents = async (
  sourcePath: string,
  destinationPath: string,
): Promise<void> => {
  await ensureDirectory(path.dirname(destinationPath));
  await copyFile(sourcePath, destinationPath);
};
