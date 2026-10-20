// @vitest-environment node
import { spawn, spawnSync } from 'node:child_process';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises';
import type * as FileSystem from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, vi } from 'vitest';

import { resolveInstructionWriteTarget } from '../instruction-link/index.ts';

import { updateManagedFile } from './index.ts';

const injection = vi.hoisted(() => ({
  beforeReplace: undefined as (() => Promise<void>) | undefined,
}));
vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof FileSystem>();
  return {
    ...original,
    writeFile: async (...arguments_: Parameters<typeof original.writeFile>) => {
      await original.writeFile(...arguments_);
      if (typeof arguments_[0] === 'string' && arguments_[0].endsWith('.tmp'))
        await injection.beforeReplace?.();
    },
  };
});
const BLOCK = '<!-- moldea:start -->\nInstructions\n<!-- moldea:end -->\n';

test.each(['README.md', 'AGENTS.md'] as const)(
  'preserves CRLF from a real Git checkout when updating %s',
  async (fileName) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-checkout-eol-'));
    const target = join(root, fileName);
    const git = (...args: string[]) => {
      const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 10_000 });
      expect(result.status, result.stderr).toBe(0);
    };
    try {
      git('init', '--quiet');
      git('config', 'core.autocrlf', 'true');
      await writeFile(target, '# Café\n');
      git('add', '--', fileName);
      git(
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'user.name=Fixture',
        '-c',
        'user.email=fixture@example.com',
        'commit',
        '--quiet',
        '-m',
        'Line-ending fixture',
      );
      await rm(target);
      git('checkout', '--', fileName);
      expect(await readFile(target)).toStrictEqual(Buffer.from('# Café\r\n'));
      const block = '<!-- moldea:start -->\n\nManaged content\n<!-- moldea:end -->\n';
      expect(await updateManagedFile(root, block, fileName)).toBe('updated');
      const expected = Buffer.from('# Café\r\n\r\n' + block.replaceAll('\n', '\r\n'));
      expect(await readFile(target)).toStrictEqual(expected);
      expect(await updateManagedFile(root, block, fileName)).toBe('unchanged');
      expect(await readFile(target)).toStrictEqual(expected);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

// Windows sharing locks deny replacement; POSIX open handles do not provide that behavior
test.skipIf(process.platform !== 'win32').each(['README.md', 'AGENTS.md'] as const)(
  'a locked %s reports the write error and leaves no temporary file',
  async (fileName) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-locked-writer-'));
    const target = join(root, fileName);
    await writeFile(target, '# Original\n');
    const lock = spawn(
      'pwsh',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "$handle = [IO.File]::Open($env:MOLDEA_TEST_LOCK_TARGET, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read); try { [Console]::Out.WriteLine('ready'); [Console]::In.ReadLine() | Out-Null } finally { $handle.Dispose() }",
      ],
      {
        env: { ...process.env, MOLDEA_TEST_LOCK_TARGET: target },
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: AbortSignal.timeout(10_000),
      },
    );
    const closed = new Promise<void>((resolveClosed) => lock.once('close', () => resolveClosed()));
    const ready = new Promise<Buffer>((resolveReady, rejectReady) => {
      lock.stdout.once('data', resolveReady);
      lock.once('error', rejectReady);
      lock.once('close', () =>
        rejectReady(new Error('Windows file lock closed before readiness.')),
      );
    });
    try {
      expect((await ready).toString().trim()).toBe('ready');
      await expect(
        updateManagedFile(root, '<!-- moldea:start -->\n\nNew\n<!-- moldea:end -->\n', fileName),
      ).rejects.toThrow(new RegExp(`(?:EPERM|EACCES|EBUSY).*${fileName.replace('.', '\\.')}`, 'u'));
      expect(await readFile(target, 'utf8')).toBe('# Original\n');
      expect(await readdir(root)).toStrictEqual([fileName]);
    } finally {
      lock.stdin.end('\n');
      if (lock.exitCode === null && lock.signalCode === null) lock.kill();
      await closed;
      await rm(root, { recursive: true, force: true });
    }
  },
);

test.each(['existing', 'new'])(
  'detects a changed %s target and removes temporary files',
  async (condition) => {
    const root = await mkdtemp(join(tmpdir(), 'moldea-block-'));
    const target = join(root, 'AGENTS.md');
    try {
      if (condition === 'existing') await writeFile(target, '# Original\n');
      injection.beforeReplace = () => writeFile(target, '# Concurrent edit\n');
      await expect(updateManagedFile(root, BLOCK, 'AGENTS.md')).rejects.toThrow(
        /changed before replacement/u,
      );
      expect(await readFile(target, 'utf8')).toBe('# Concurrent edit\n');
      expect(await readdir(root)).toStrictEqual(['AGENTS.md']);
    } finally {
      injection.beforeReplace = undefined;
      await rm(root, { recursive: true, force: true });
    }
  },
);

test('writes a linked AGENTS.md through its resolved target and refuses links otherwise', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'moldea-block-link-')));
  const linkPath = join(root, 'AGENTS.md');
  try {
    spawnSync('git', ['init', '-q'], { cwd: root });
    await mkdir(join(root, 'docs'));
    await writeFile(join(root, 'docs', 'AGENTS.md'), '# Rules\n');
    await symlink(
      join('docs', 'AGENTS.md'),
      linkPath,
      process.platform === 'win32' ? 'file' : undefined,
    );
    await expect(updateManagedFile(root, BLOCK, 'AGENTS.md')).rejects.toThrow(
      'AGENTS.md must be a regular file',
    );

    await expect(
      updateManagedFile(root, BLOCK, 'AGENTS.md', () =>
        resolveInstructionWriteTarget(root, 'AGENTS.md'),
      ),
    ).resolves.toBe('updated');
    expect((await lstat(linkPath)).isSymbolicLink()).toBe(true);
    const [opened, target] = await Promise.all([
      stat(linkPath, { bigint: true }),
      stat(join(root, 'docs', 'AGENTS.md'), { bigint: true }),
    ]);
    expect(opened.ino).toBe(target.ino);
    expect(await readFile(linkPath, 'utf8')).toBe(`# Rules\n\n${BLOCK}`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
