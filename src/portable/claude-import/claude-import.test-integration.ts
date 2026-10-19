// @vitest-environment node
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';

import { updateClaudeImport } from './index.ts';

const isWindows = process.platform === 'win32';
const temporaryRoots: string[] = [];

const createRoot = async (): Promise<string> => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'moldea-claude-import-')));
  temporaryRoots.push(directory);
  const root = join(directory, 'repository');
  await mkdir(root);
  return root;
};

afterEach(async () => {
  for (const directory of temporaryRoots.splice(0))
    await rm(directory, { recursive: true, force: true });
});

test('appends the import once, keeping CRLF, and never creates a file', async () => {
  const root = await createRoot();
  await expect(updateClaudeImport(root, '/CLAUDE.md')).rejects.toThrow(
    'CLAUDE.md does not exist, and Claude instruction files are never created',
  );
  await expect(updateClaudeImport(root, '/.claude/CLAUDE.md')).rejects.toThrow(
    '.claude/CLAUDE.md does not exist',
  );
  expect(await readdir(root)).toStrictEqual([]);

  await writeFile(join(root, 'CLAUDE.md'), '# Claude\r\nKeep\r\n');
  await expect(updateClaudeImport(root, '/CLAUDE.md')).resolves.toBe('updated');
  await expect(updateClaudeImport(root, '/CLAUDE.md')).resolves.toBe('unchanged');
  expect(await readFile(join(root, 'CLAUDE.md'), 'utf8')).toBe(
    '# Claude\r\nKeep\r\n@AGENTS.md\r\n',
  );

  await mkdir(join(root, '.claude'));
  await writeFile(join(root, '.claude', 'CLAUDE.md'), '# Nested');
  await expect(updateClaudeImport(root, '/.claude/CLAUDE.md')).resolves.toBe('updated');
  expect(await readFile(join(root, '.claude', 'CLAUDE.md'), 'utf8')).toBe(
    '# Nested\n@../AGENTS.md\n',
  );
  expect((await readdir(root)).some((name) => name.endsWith('.tmp'))).toBe(false);
});

test('updates an inside link target and refuses an outside one', async () => {
  const root = await createRoot();
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs', 'claude.md'), '# Linked\n');
  await symlink(join('docs', 'claude.md'), join(root, 'CLAUDE.md'), isWindows ? 'file' : undefined);

  await expect(updateClaudeImport(root, '/CLAUDE.md')).resolves.toBe('updated');
  expect((await lstat(join(root, 'CLAUDE.md'))).isSymbolicLink()).toBe(true);
  expect(await readFile(join(root, 'CLAUDE.md'), 'utf8')).toBe('# Linked\n@AGENTS.md\n');

  const outside = join(root, '..', 'personal.md');
  await writeFile(outside, '# Personal\n');
  await symlink(outside, join(root, 'CLAUDE.local.md'), isWindows ? 'file' : undefined);
  await expect(updateClaudeImport(root, '/CLAUDE.local.md')).rejects.toThrow(
    'CLAUDE.local.md links to a file outside the repository',
  );
  expect(await readFile(outside, 'utf8')).toBe('# Personal\n');
});
