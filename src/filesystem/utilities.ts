import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { hashValue } from 'jg-crypto';
import { parse as parseYaml } from 'yaml';

import type { IBoundarySchema } from './types.ts';

/** Calculates a lowercase SHA-256 digest for exact bytes. */
export const calculateSha256 = (content: string | Uint8Array): string => hashValue(content);

/** Normalizes host permissions to the executable distinction preserved by Git. */
export const normalizePortableFilesystemMode = (kind: 'file' | 'symlink', mode: number): number => {
  if (kind === 'symlink') return 0o120000;
  return (mode & 0o111) === 0 ? 0o100644 : 0o100755;
};

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

  throw new Error(`Path escapes its trusted root: ${relativePath}`);
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
