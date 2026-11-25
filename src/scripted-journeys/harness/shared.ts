import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { hashValue } from 'jg-crypto';

import {
  EXCLUDED_DIRECTORIES,
  MAXIMUM_ARCHIVE_BYTES,
  MAXIMUM_ARCHIVE_ENTRIES,
  MAXIMUM_ENTRY_BYTES,
} from '../index.ts';

/** Rejects nonportable or escaping logical paths before filesystem access. */
export const assertSafePath = (relativePath: string, allowNpmCache = false): void => {
  const isCacheContent =
    allowNpmCache &&
    /^(?:journeys-\d{8}-[a-f0-9]{6}\/)?(?:npm-cache\/)?(?:_cacache\/)?content-v2\/sha512\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{124}$/u.test(
      relativePath,
    );
  if (
    !relativePath ||
    relativePath.length > (isCacheContent ? 256 : 160) ||
    relativePath.includes('\\') ||
    relativePath.startsWith('/')
  )
    throw new Error(`Unsafe path: ${relativePath}`);
  for (const component of relativePath.split('/')) {
    if (
      !/^[a-zA-Z0-9_.@-]+$/u.test(component) ||
      component.length > (isCacheContent ? 124 : 64) ||
      component === '.' ||
      component === '..' ||
      /[. ]$/u.test(component) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(component) ||
      EXCLUDED_DIRECTORIES.includes(component)
    )
      throw new Error(`Unsafe path: ${relativePath}`);
  }
};

/** Resolves a validated logical path below a trusted directory. */
export const containedPath = (
  root: string,
  relativePath: string,
  allowNpmCache = false,
): string => {
  assertSafePath(relativePath, allowNpmCache);
  const candidate = path.resolve(root, ...relativePath.split('/'));
  const relative = path.relative(path.resolve(root), candidate);
  if (
    !relative ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error(`Path escapes root: ${relativePath}`);
  return candidate;
};

/** Hashes exchange bytes without interpreting their contents. */
export const sha256 = (bytes: string | Uint8Array): string => hashValue(bytes);

/** Inventories bounded regular files; refuses links and special files before reading. */
export const treeHashes = async (
  root: string,
  ignored: string[] = [],
  allowNpmCache = false,
): Promise<Record<string, string>> => {
  const hashes = Object.create(null) as Record<string, string>;
  let bytes = 0;
  let count = 0;
  const seen = new Set<string>();
  const visit = async (directory: string, prefix: string): Promise<void> => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    )) {
      if (ignored.includes(entry.name)) continue;
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      assertSafePath(relativePath, allowNpmCache);
      if (++count > MAXIMUM_ARCHIVE_ENTRIES || seen.has(relativePath.toLowerCase()))
        throw new Error('Too many entries or case-insensitive path collision.');
      seen.add(relativePath.toLowerCase());
      const absolutePath = containedPath(root, relativePath, allowNpmCache);
      const stat = await lstat(absolutePath);
      if (stat.isDirectory()) await visit(absolutePath, relativePath);
      else if (stat.isFile()) {
        bytes += stat.size;
        if (stat.size > MAXIMUM_ENTRY_BYTES || bytes > MAXIMUM_ARCHIVE_BYTES)
          throw new Error('Tree exceeds exchange size limits.');
        hashes[relativePath] = sha256(await readFile(absolutePath));
      } else throw new Error(`Non-regular entry: ${relativePath}`);
    }
  };
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink())
    throw new Error('Tree root must be a real directory.');
  await visit(root, '');
  return Object.fromEntries(
    Object.entries(hashes).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  );
};

/** Validates whole-journey selection and returns canonical bundle order. */
export const selectJourneys = (
  inventory: { id: string }[],
  requested?: string[],
  confirmationIndex: number | null = null,
): string[] => {
  const ids = requested ?? inventory.map((journey) => journey.id);
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !inventory.some((journey) => journey.id === id))
  )
    throw new Error('Journey selection must contain unique known IDs.');
  if (
    confirmationIndex !== null &&
    (!Number.isInteger(confirmationIndex) ||
      confirmationIndex < 1 ||
      confirmationIndex > 3 ||
      ids.length !== 1)
  )
    throw new Error('Confirmation requires index 1, 2, or 3 and exactly one journey.');
  return inventory.filter((journey) => ids.includes(journey.id)).map((journey) => journey.id);
};
