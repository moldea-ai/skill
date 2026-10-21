// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { lstat, mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isPathWithin } from 'jg-fs';
import { expect, test } from 'vitest';

import { createResponseDirectory } from './response-directory.ts';

test('bundled command creates a private directory usable for response pages', async () => {
  const repository = await mkdtemp(join(tmpdir(), 'moldea-response-test-'));
  let directory: string | undefined;
  try {
    const result = spawnSync(
      process.execPath,
      [
        resolve(import.meta.dirname, '../../../moldea/scripts/response-directory.mjs'),
        '--repository',
        repository,
      ],
      { encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    directory = result.stdout.trim();
    expect(isPathWithin(await realpath(tmpdir()), directory)).toBe(true);
    expect(isPathWithin(repository, directory)).toBe(false);
    const stats = await lstat(directory);
    expect(stats.isDirectory()).toBe(true);
    if (process.platform !== 'win32') expect(stats.mode & 0o777).toBe(0o700);
  } finally {
    if (directory !== undefined) await rm(directory, { recursive: true, force: true });
    await rm(repository, { recursive: true, force: true });
  }
});

test('rejects a relative repository before creating storage', async () => {
  await expect(createResponseDirectory('.')).rejects.toThrow('absolute repository');
});
