// @vitest-environment node
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';

import { writeBufferFileAtomically } from './index.ts';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

test('preserves byte-writer callers and removes staging files after success and cancellation', async () => {
  const root = await mkdtemp(join(tmpdir(), 'moldea-bytes-'));
  roots.push(root);
  const target = join(root, 'page.json');
  await writeFile(target, 'old');
  const controller = new AbortController();
  controller.abort();
  await expect(
    writeBufferFileAtomically(target, Buffer.from('cancelled'), controller.signal),
  ).rejects.toThrow();
  expect(await readFile(target, 'utf8')).toBe('old');
  await writeBufferFileAtomically(target, Buffer.from('complete'));
  expect(await readFile(target, 'utf8')).toBe('complete');
  expect(await readdir(root)).toStrictEqual(['page.json']);
});
