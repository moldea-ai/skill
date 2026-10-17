// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

const TEST_NODE = process.env['MOLDEA_TEST_NODE'] ?? process.execPath;
const SKILL_ROOT = resolve(import.meta.dirname, '../../moldea');

test('bundled README writer runs through a directory link', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-readme-link-'));
  try {
    const installed = join(root, 'installed');
    const linked = join(root, 'linked');
    await mkdir(installed);
    await copyFile(join(SKILL_ROOT, 'scripts/managed-readme.mjs'), join(installed, 'writer.mjs'));
    await symlink(installed, linked, process.platform === 'win32' ? 'junction' : 'dir');
    const result = spawnSync(TEST_NODE, [join(linked, 'writer.mjs'), '--repository', root], {
      encoding: 'utf8',
      timeout: 10_000,
    });
    expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toStrictEqual({
      status: 0,
      stdout: 'created\n',
      stderr: '',
    });
    expect(await readFile(join(root, 'README.md'))).toStrictEqual(
      await readFile(join(SKILL_ROOT, 'assets/managed-readme-block.md')),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each(['append', 'replace'])(
  'bundled README writer preserves CRLF and outside bytes during %s and remains unchanged on repeat',
  async (operation) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-readme-crlf-'));
    try {
      const block = (
        await readFile(join(SKILL_ROOT, 'assets/managed-readme-block.md'), 'utf8')
      ).replaceAll('\n', '\r\n');
      const prefix = '\uFEFF# Café\r\n';
      const suffix = '\r\nKeep this outside text.\r\n';
      const target = join(root, 'README.md');
      await writeFile(
        target,
        operation === 'append'
          ? prefix
          : `${prefix}\r\n<!-- moldea:start -->\r\n\r\nStale\r\n<!-- moldea:end -->\r\n${suffix}`,
      );
      const run = () =>
        spawnSync(
          TEST_NODE,
          [join(SKILL_ROOT, 'scripts/managed-readme.mjs'), '--repository', root],
          { encoding: 'utf8', timeout: 10_000 },
        );
      const updated = run();
      expect({
        status: updated.status,
        stdout: updated.stdout,
        stderr: updated.stderr,
      }).toStrictEqual({ status: 0, stdout: 'updated\n', stderr: '' });
      const expected = Buffer.from(
        prefix + '\r\n' + block + (operation === 'replace' ? suffix : ''),
      );
      expect(await readFile(target)).toStrictEqual(expected);
      const repeated = run();
      expect({
        status: repeated.status,
        stdout: repeated.stdout,
        stderr: repeated.stderr,
      }).toStrictEqual({ status: 0, stdout: 'unchanged\n', stderr: '' });
      expect(await readFile(target)).toStrictEqual(expected);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
