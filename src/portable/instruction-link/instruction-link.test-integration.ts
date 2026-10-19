// @vitest-environment node
import fsPromises, {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';

import { resolveInstructionLink, resolveInstructionWriteTarget } from './index.ts';

const isWindows = process.platform === 'win32';
const temporaryRoots: string[] = [];

const createRoot = async (): Promise<string> => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'moldea-instruction-link-')));
  temporaryRoots.push(directory);
  const root = join(directory, 'repository');
  await mkdir(root);
  return root;
};

const link = async (target: string, linkPath: string, kind: 'dir' | 'file' = 'file') =>
  symlink(target, linkPath, isWindows ? kind : undefined);

// the OS oracle: the file the OS opens through the link is the selected host file
const expectSameFile = async (linkPath: string, hostPath: string): Promise<void> => {
  const [opened, selected] = await Promise.all([
    stat(linkPath, { bigint: true }),
    stat(hostPath, { bigint: true }),
  ]);
  expect([opened.dev, opened.ino]).toStrictEqual([selected.dev, selected.ino]);
};

afterEach(async () => {
  for (const directory of temporaryRoots.splice(0))
    await rm(directory, { recursive: true, force: true });
});

test('selects a regular or absent instruction file itself', async () => {
  const root = await createRoot();
  const absent = await resolveInstructionWriteTarget(root, 'AGENTS.md');
  expect(absent.hostPath).toBe(join(root, 'AGENTS.md'));
  await writeFile(join(root, 'AGENTS.md'), '# Rules\n');
  const regular = await resolveInstructionWriteTarget(root, 'AGENTS.md');
  expect(regular.hostPath).toBe(join(root, 'AGENTS.md'));
  await expect(regular.confirm()).resolves.toBeUndefined();
  await expect(resolveInstructionLink(root, 'AGENTS.md')).resolves.toStrictEqual({
    state: 'not-link',
  });
});

test('selects the regular-file target of an inside link and confirms it is kept', async () => {
  const root = await createRoot();
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
  await link(join('docs', 'AGENTS.md'), join(root, 'AGENTS.md'));

  const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');

  expect(target.hostPath).toBe(join(root, 'docs', 'AGENTS.md'));
  await expectSameFile(join(root, 'AGENTS.md'), target.hostPath);
  await expect(target.confirm()).resolves.toBeUndefined();
  await rm(join(root, 'AGENTS.md'));
  await writeFile(join(root, 'other.md'), '# Other\n');
  await link('other.md', join(root, 'AGENTS.md'));
  await expect(target.confirm()).rejects.toThrow(
    'AGENTS.md changed its link target during the update',
  );
});

test('follows .. after a directory link to the file the OS opens, or refuses it', async () => {
  for (const isOutside of [false, true]) {
    const root = await createRoot();
    const nested = isOutside ? join(root, '..', 'outside', 'nested') : join(root, 'deep', 'nested');
    await mkdir(nested, { recursive: true });
    await writeFile(join(nested, '..', 'shared.md'), 'physical\n');
    await writeFile(join(root, 'shared.md'), 'lexical\n');
    await link(nested, join(root, 'dir-link'), 'dir');
    await link(join('dir-link', '..', 'shared.md'), join(root, 'AGENTS.md'));
    const opened = await readFile(join(root, 'AGENTS.md'), 'utf8');

    if (isOutside && opened === 'physical\n') {
      await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(
        'AGENTS.md links to a file outside the repository',
      );
      expect(await readFile(join(root, 'shared.md'), 'utf8')).toBe('lexical\n');
    } else {
      const target = await resolveInstructionWriteTarget(root, 'AGENTS.md');
      await expectSameFile(join(root, 'AGENTS.md'), target.hostPath);
    }
  }
});

test.each([
  ['outside', 'AGENTS.md links to a file outside the repository'],
  ['broken', 'AGENTS.md is a broken link'],
  ['loop', 'AGENTS.md is a link loop'],
  ['directory', 'AGENTS.md links to a directory, not a regular file'],
])('refuses a %s link without changing any file', async (condition, message) => {
  const root = await createRoot();
  const outsidePath = join(root, '..', 'outside.md');
  await writeFile(outsidePath, 'outside\n');
  await mkdir(join(root, 'docs'));
  if (condition === 'outside') await link(outsidePath, join(root, 'AGENTS.md'));
  if (condition === 'broken') await link('missing.md', join(root, 'AGENTS.md'));
  if (condition === 'loop') {
    await link('loop.md', join(root, 'AGENTS.md'));
    await link('AGENTS.md', join(root, 'loop.md'));
  }
  if (condition === 'directory') await link('docs', join(root, 'AGENTS.md'), 'dir');

  await expect(resolveInstructionWriteTarget(root, 'AGENTS.md')).rejects.toThrow(message);
  expect(await readFile(outsidePath, 'utf8')).toBe('outside\n');
});

test('refuses network targets without filesystem access beneath them', async () => {
  const root = await createRoot();
  const targets = [
    isWindows ? '\\\\server\\share\\AGENTS.md' : '//server/share/AGENTS.md',
    ...(isWindows ? [] : [`${'../'.repeat(24)}net/host/share/AGENTS.md`]),
  ];
  const observed: string[] = [];
  const record =
    <TArguments extends unknown[], TResult>(
      original: (...parameters: TArguments) => TResult,
    ): ((...parameters: TArguments) => TResult) =>
    (...parameters) => {
      observed.push(String(parameters[0]));
      return original(...parameters);
    };

  for (const target of targets) {
    await rm(join(root, 'AGENTS.md'), { force: true });
    await link(target, join(root, 'AGENTS.md'));
    const originalLstat = fsPromises.lstat;
    const originalReadlink = fsPromises.readlink;
    const originalOpen = fsPromises.open;
    vi.spyOn(fsPromises, 'lstat').mockImplementation(record(originalLstat));
    vi.spyOn(fsPromises, 'readlink').mockImplementation(record(originalReadlink));
    vi.spyOn(fsPromises, 'open').mockImplementation(record(originalOpen));
    syncBuiltinESMExports();
    try {
      await expect(resolveInstructionWriteTarget(root, 'AGENTS.md'), target).rejects.toThrow(
        'AGENTS.md links to a network, device, or otherwise unsafe target',
      );
    } finally {
      vi.restoreAllMocks();
      syncBuiltinESMExports();
    }
  }

  expect(observed.length).toBeGreaterThan(0);
  expect(
    observed.filter((hostPath) => /^(?:[\\/]{2}|[\\/]net(?:[\\/]|$))/iu.test(hostPath)),
  ).toStrictEqual([]);
});

test('requires a nested instruction file to sit in a real directory', async () => {
  const root = await createRoot();
  const outside = join(root, '..', 'claude-outside');
  await mkdir(outside);
  await writeFile(join(outside, 'CLAUDE.md'), '# Outside\n');
  await link(outside, join(root, '.claude'), 'dir');

  await expect(resolveInstructionWriteTarget(root, '.claude/CLAUDE.md')).rejects.toThrow(
    '.claude must be a regular directory',
  );
  await rm(join(root, '.claude'));
  const absent = await resolveInstructionWriteTarget(root, '.claude/CLAUDE.md');
  expect(absent.hostPath).toBe(join(root, '.claude', 'CLAUDE.md'));
});
