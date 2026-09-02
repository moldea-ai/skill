import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, type Dirent } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { parse as parseYaml } from 'yaml';
import { type z } from 'zod';

import { RAW_SOURCE_REPOSITORY_URL, SOURCE_REPOSITORY_URL } from '../model/constants.ts';

const EXCLUDED_DIRECTORY_NAMES = new Set(['_archive', '_archives', '_backup', '_backups']);

/** Lists immediate directories in stable order while enforcing hard source exclusions. */
export const listDirectories = (directory: string): Dirent[] => {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => {
      if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
        throw new Error(`Qualification source contains excluded directory ${entry.name}.`);
      }

      return entry.isDirectory();
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
};

/** Lists regular files below one directory and rejects symlinks and excluded trees. */
export const listFiles = (directory: string): string[] => {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
    .flatMap((entry): string[] => {
      if (entry.isDirectory() && EXCLUDED_DIRECTORY_NAMES.has(entry.name)) {
        throw new Error(`Qualification evidence contains excluded directory ${entry.name}.`);
      }

      const path = join(directory, entry.name);

      if (entry.isDirectory()) return listFiles(path);
      if (!entry.isFile()) {
        throw new Error(`Qualification evidence must be a regular file: ${path}`);
      }

      return [path];
    });
};

/** Resolves a validated relative path and keeps it inside its owning directory. */
export const resolveContainedPath = (directory: string, relativePath: string): string => {
  const resolvedDirectory = resolve(directory);
  const resolvedPath = resolve(resolvedDirectory, relativePath);
  const containedPrefix = `${resolvedDirectory}${sep}`;

  if (isAbsolute(relativePath) || !resolvedPath.startsWith(containedPrefix)) {
    throw new Error(`Qualification path escapes its owning directory: ${relativePath}`);
  }

  return resolvedPath;
};

/** Reads and validates one JSON file with a path-specific failure. */
export const readJsonFile = <Output>(path: string, schema: z.ZodType<Output>): Output => {
  try {
    return schema.parse(JSON.parse(readFileSync(path, 'utf8')) as unknown);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON validation failure.';
    throw new Error(`Invalid qualification JSON ${path}: ${message}`, { cause: error });
  }
};

/** Reads and validates one YAML file with a path-specific failure. */
export const readYamlFile = <Output>(path: string, schema: z.ZodType<Output>): Output => {
  try {
    return schema.parse(parseYaml(readFileSync(path, 'utf8')));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown YAML validation failure.';
    throw new Error(`Invalid qualification YAML ${path}: ${message}`, { cause: error });
  }
};

/** Returns a repository-relative POSIX path for a validated source file. */
export const getRepositoryRelativePath = (repositoryRoot: string, path: string): string => {
  const relativePath = relative(repositoryRoot, path).replaceAll(sep, '/');

  if (relativePath === '' || relativePath === '..' || relativePath.startsWith('../')) {
    throw new Error(`Qualification source is outside the repository: ${path}`);
  }

  return relativePath;
};

const encodeRepositoryPath = (path: string): string =>
  path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

/** Creates a GitHub source link for a committed file or directory. */
export const createSourceUrl = (
  path: string,
  kind: 'blob' | 'tree' = 'blob',
  revision = 'main',
): string => {
  return `${SOURCE_REPOSITORY_URL}/${kind}/${encodeURIComponent(revision)}/${encodeRepositoryPath(path)}`;
};

/** Creates a direct raw-content link for one committed evidence artifact. */
export const createRawSourceUrl = (path: string, revision = 'main'): string => {
  return `${RAW_SOURCE_REPOSITORY_URL}/${encodeURIComponent(revision)}/${encodeRepositoryPath(path)}`;
};

/** Calculates the exact SHA-256 digest of one regular evidence file. */
export const calculateFileSha256 = (path: string): string => {
  const stats = lstatSync(path);

  if (!stats.isFile()) throw new Error(`Qualification evidence must be a regular file: ${path}`);

  return createHash('sha256').update(readFileSync(path)).digest('hex');
};
