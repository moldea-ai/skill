import { lstat, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

import { MAXIMUM_ARCHIVE_BYTES, MAXIMUM_ARCHIVE_ENTRIES, MAXIMUM_ENTRY_BYTES } from '../index.ts';
import { assertSafePath, runCommand, treeHashes } from '../harness/index.ts';

/** Preflights names, sizes, types, collisions, and the single archive root before extraction. */
export const inspectArchive = async (
  archivePath: string,
  allowNpmCache = false,
): Promise<string> => {
  const stat = await lstat(archivePath);
  if (!stat.isFile() || stat.size > MAXIMUM_ARCHIVE_BYTES)
    throw new Error('Archive must be a bounded regular file.');
  const cwd = path.dirname(archivePath);
  const names = (await runCommand('unzip', ['-Z', '-1', archivePath], cwd)).stdout
    .trimEnd()
    .split('\n');
  const listing = (await runCommand('unzip', ['-Z', '-l', archivePath], cwd)).stdout;
  const entries = listing.split('\n').filter((line) => /^[?dlcbps-]\S{6,9}\s/u.test(line));
  if (!names.length || names.length > MAXIMUM_ARCHIVE_ENTRIES || entries.length !== names.length)
    throw new Error('Archive entry inventory is ambiguous or exceeds its limit.');
  const seen = new Map<string, boolean>();
  const roots = new Set<string>();
  let totalBytes = 0;
  for (let index = 0; index < entries.length; index++) {
    const fields = entries[index]!.trim().split(/\s+/u);
    const original = names[index]!;
    const name = original.endsWith('/') ? original.slice(0, -1) : original;
    const mode = fields[0]!;
    const size = Number(fields[3]);
    if (
      fields.length !== 10 ||
      fields[9] !== original ||
      !['-', 'd'].includes(mode[0]!) ||
      (mode[0] === 'd') !== original.endsWith('/') ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > MAXIMUM_ENTRY_BYTES
    )
      throw new Error(`Unsupported archive entry: ${original}`);
    assertSafePath(name, allowNpmCache);
    const key = name.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate or case-insensitive archive path: ${original}`);
    seen.set(key, mode[0] === 'd');
    roots.add(name.split('/')[0]!);
    totalBytes += size;
    if (totalBytes > MAXIMUM_ARCHIVE_BYTES)
      throw new Error('Archive expands beyond its size limit.');
  }
  for (const name of seen.keys()) {
    const parts = name.split('/');
    parts.pop();
    while (parts.length) {
      if (seen.get(parts.join('/')) === false) throw new Error('Archive file/directory collision.');
      parts.pop();
    }
  }
  if (roots.size !== 1 || !names.some((name) => name.includes('/')))
    throw new Error('Archive requires one directory root.');
  return [...roots][0]!;
};

/** Extracts only a preflighted archive into an empty directory and scans again for links. */
export const extractArchive = async (
  archivePath: string,
  destination: string,
  allowNpmCache = false,
): Promise<string> => {
  const root = await inspectArchive(path.resolve(archivePath), allowNpmCache);
  await mkdir(destination, { recursive: true });
  if ((await readdir(destination)).length)
    throw new Error('Archive extraction destination must be empty.');
  await runCommand('unzip', ['-q', path.resolve(archivePath), '-d', destination], destination);
  await treeHashes(destination, [], allowNpmCache);
  return path.join(destination, root);
};

/** Packs a scanned directory without a shell; existing outputs are never overwritten. */
export const createArchive = async (
  directory: string,
  outputPath: string,
  allowNpmCache = false,
): Promise<void> => {
  await treeHashes(directory, [], allowNpmCache);
  try {
    await lstat(outputPath);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await runCommand(
        'zip',
        ['-q', '-r', path.resolve(outputPath), path.basename(directory)],
        path.dirname(directory),
      );
      await inspectArchive(path.resolve(outputPath), allowNpmCache);
      return;
    }
    throw error;
  }
  throw new Error(`Archive already exists: ${outputPath}`);
};
