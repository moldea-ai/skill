import { closeSync, constants, fstatSync, lstatSync, openSync, opendirSync } from 'node:fs';
import { join } from 'node:path';

import { hashValue } from 'jg-crypto';
import { readBoundedFile } from 'jg-fs/sync';

import { EXCLUDED_DIRECTORY_NAMES } from '../../../filesystem/index.ts';
import { MOLDEA_SKILL_RESOURCE_PROFILES } from '../../../resources/index.ts';

const MAXIMUM_ENTRIES = 4096;
const MAXIMUM_DEPTH = 64;
const MAXIMUM_BYTES = MOLDEA_SKILL_RESOURCE_PROFILES.absolute.maxHostOutputBytes;

/**
 * Observes canonical bytes at a runtime boundary without retaining contents or following links.
 * @returns A deterministic content digest, an absence digest, or null for incomplete observation.
 */
export const observeCanonicalDigest = (root: string): string | null => {
  let rootIdentity: string;
  try {
    const rootStats = lstatSync(root, { bigint: true });
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) return null;
    rootIdentity = `${rootStats.dev}:${rootStats.ino}`;
  } catch (error) {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT'
      ? hashValue('canonical-absent')
      : null;
  }
  const entries: Array<[string, string]> = [];
  let entryCount = 0;
  let byteCount = 0;
  // Linux evaluator only: pinned directory descriptors prevent linked-parent traversal races.
  const visit = (directory: string, relativeDirectory: string, depth: number): void => {
    if (depth > MAXIMUM_DEPTH) throw new Error('Canonical observation depth exceeded.');
    const descriptor = openSync(
      directory,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    let handle;
    try {
      const anchoredDirectory = `/proc/self/fd/${descriptor}`;
      const directoryBefore = fstatSync(descriptor, { bigint: true });
      handle = opendirSync(anchoredDirectory);
      for (let entry = handle.readSync(); entry !== null; entry = handle.readSync()) {
        if (++entryCount > MAXIMUM_ENTRIES || EXCLUDED_DIRECTORY_NAMES.has(entry.name))
          throw new Error('Canonical observation is incomplete.');
        const path = join(anchoredDirectory, entry.name);
        const relativePath =
          relativeDirectory === '' ? entry.name : `${relativeDirectory}/${entry.name}`;
        const before = lstatSync(path, { bigint: true });
        if (before.isDirectory()) {
          visit(path, relativePath, depth + 1);
          continue;
        }
        if (
          !before.isFile() ||
          before.isSymbolicLink() ||
          before.size > BigInt(MAXIMUM_BYTES - byteCount)
        )
          throw new Error('Canonical observation is incomplete.');
        const content = readBoundedFile(path, Math.max(1, Number(before.size)));
        const after = lstatSync(path, { bigint: true });
        if (
          before.ino !== after.ino ||
          before.size !== after.size ||
          before.mtimeNs !== after.mtimeNs ||
          before.ctimeNs !== after.ctimeNs ||
          BigInt(content.length) !== before.size
        )
          throw new Error('Canonical observation changed while being read.');
        byteCount += content.length;
        entries.push([relativePath, hashValue(content)]);
      }
      const directoryAfter = fstatSync(descriptor, { bigint: true });
      if (
        directoryBefore.mtimeNs !== directoryAfter.mtimeNs ||
        directoryBefore.ctimeNs !== directoryAfter.ctimeNs
      )
        throw new Error('Canonical directory changed during observation.');
    } finally {
      try {
        handle?.closeSync();
      } finally {
        closeSync(descriptor);
      }
    }
  };
  try {
    visit(root, '', 0);
    const rootAfter = lstatSync(root, { bigint: true });
    if (
      !rootAfter.isDirectory() ||
      rootAfter.isSymbolicLink() ||
      `${rootAfter.dev}:${rootAfter.ino}` !== rootIdentity
    )
      return null;
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return hashValue(JSON.stringify(entries));
  } catch {
    return null;
  }
};
