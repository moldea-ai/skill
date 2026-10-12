// @vitest-environment node
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import { assertSafePath, runCommand } from '../harness/index.ts';

import { createArchive, extractArchive, inspectArchive } from './archive.ts';

/** Writes ZIP metadata fixtures that must be refused without extracting their payloads. */
const writeTestArchive = async (
  file: string,
  entries: { name: string; size: number }[],
): Promise<void> => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(entry.size, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(entry.size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(0o100644 * 65536, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  await writeFile(file, Buffer.concat([...localParts, central, end]));
};

test('archives round trip and refuse symlinks before extraction, duplicate paths, and size bombs', async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), 'journeys-archive-'));
  try {
    const root = path.join(scratch, 'payload');
    await mkdir(root);
    await writeFile(path.join(root, 'file.txt'), 'safe');
    const archive = path.join(scratch, 'safe.zip');
    await createArchive(root, archive);
    expect(await extractArchive(archive, path.join(scratch, 'out'))).toBe(
      path.join(scratch, 'out/payload'),
    );
    await symlink('file.txt', path.join(root, 'link'));
    await runCommand('zip', ['-q', '-y', '-r', path.join(scratch, 'link.zip'), 'payload'], scratch);
    await expect(inspectArchive(path.join(scratch, 'link.zip'))).rejects.toThrow(
      /Unsupported archive entry/u,
    );
    await expect(createArchive(root, path.join(scratch, 'refused.zip'))).rejects.toThrow(
      /Non-regular/u,
    );
    await writeTestArchive(path.join(scratch, 'bomb.zip'), [
      { name: 'payload/large.txt', size: 16 * 1_048_576 + 1 },
    ]);
    await expect(inspectArchive(path.join(scratch, 'bomb.zip'))).rejects.toThrow(
      /Unsupported archive entry/u,
    );
    await writeTestArchive(path.join(scratch, 'unsafe.zip'), [
      { name: 'payload/../escape', size: 0 },
    ]);
    await writeTestArchive(path.join(scratch, 'duplicate.zip'), [
      { name: 'payload/file.txt', size: 0 },
      { name: 'payload/file.txt', size: 0 },
    ]);
    await expect(inspectArchive(path.join(scratch, 'duplicate.zip'))).rejects.toThrow(/Duplicate/u);
    await expect(inspectArchive(path.join(scratch, 'unsafe.zip'))).rejects.toThrow(/Unsafe path/u);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
test('the npm cache exception is exact and opt-in', () => {
  const cache = `npm-cache/_cacache/content-v2/sha512/aa/bb/${'c'.repeat(124)}`;
  expect(() => assertSafePath(cache)).toThrow();
  expect(() => assertSafePath(cache, true)).not.toThrow();
  expect(() => assertSafePath(`exports/${'c'.repeat(124)}`, true)).toThrow();
});
