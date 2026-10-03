// @vitest-environment node
import {
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

import { prepareResponseFiles, verifyAndSaveResponse } from './index.ts';

const roots: string[] = [];
const identity = { command: 'content' as const, cliVersion: '9.0.1' };
const raw = Buffer.from(
  ' {"schemaVersion":5,"cliVersion":"9.0.1","command":"content","status":"valid","error":null,"result":{"cursor":"exact_É+/="}}\n',
);
const fixture = async () => {
  const root = await mkdtemp(join(await realpath(tmpdir()), 'moldea-response-'));
  roots.push(root);
  const repository = join(root, 'repository');
  const scratch = join(root, 'scratch');
  await mkdir(repository);
  await mkdir(scratch, { mode: 0o700 });
  return { repository, scratch, path: join(scratch, 'page.json') };
};
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

test('saves exact raw bytes, continues unchanged, and explicitly replaces the loaded checkpoint', async () => {
  const { repository, scratch, path } = await fixture();
  const files = await prepareResponseFiles(repository, identity, undefined, path);
  await verifyAndSaveResponse(files, repository, raw, identity, 0, new AbortController().signal);
  expect(await readFile(path)).toStrictEqual(raw);
  const continuation = await prepareResponseFiles(repository, identity, path, path);
  expect(continuation.cursor).toBe('exact_É+/=');
  const final = Buffer.from(raw.toString().replace('"exact_É+/="', 'null'));
  await verifyAndSaveResponse(
    continuation,
    repository,
    final,
    identity,
    0,
    new AbortController().signal,
  );
  expect(await readFile(path)).toStrictEqual(final);
  expect(await readdir(scratch)).toStrictEqual(['page.json']);
  await expect(prepareResponseFiles(repository, identity, path)).rejects.toThrow('final page');
});

test('preserves existing checkpoints after errors, malformed output, contradictory exit, and cancellation', async () => {
  const { repository, path } = await fixture();
  await writeFile(path, raw);
  const files = await prepareResponseFiles(repository, identity, path, path);
  await verifyAndSaveResponse(
    files,
    repository,
    Buffer.from(
      JSON.stringify({
        schemaVersion: 5,
        cliVersion: '9.0.1',
        command: 'content',
        status: 'error',
        error: { code: 'CURSOR_INVALID' },
        result: null,
      }),
    ),
    identity,
    3,
    new AbortController().signal,
  );
  await expect(
    verifyAndSaveResponse(
      files,
      repository,
      Buffer.from('{'),
      identity,
      0,
      new AbortController().signal,
    ),
  ).rejects.toThrow();
  await expect(
    verifyAndSaveResponse(files, repository, raw, identity, 1, new AbortController().signal),
  ).rejects.toThrow('contradicts');
  const controller = new AbortController();
  controller.abort();
  await expect(
    verifyAndSaveResponse(files, repository, raw, identity, 0, controller.signal),
  ).rejects.toThrow();
  expect(await readFile(path)).toStrictEqual(raw);
});

test('captures invalid diagnostic pages with exit one', async () => {
  const { repository, path } = await fixture();
  const invalid = Buffer.from(raw.toString().replace('"valid"', '"invalid"'));
  await verifyAndSaveResponse(
    await prepareResponseFiles(repository, identity, undefined, path),
    repository,
    invalid,
    identity,
    1,
    new AbortController().signal,
  );
  expect(await readFile(path)).toStrictEqual(invalid);
});

test('protects unrelated existing files and rejects repository, relative, public, and missing-directory targets', async () => {
  const { repository, path, scratch } = await fixture();
  await writeFile(path, raw);
  for (const target of [
    path,
    join(repository, 'page.json'),
    'page.json',
    join(tmpdir(), 'page.json'),
    join(scratch, 'missing', 'page.json'),
  ]) {
    await expect(prepareResponseFiles(repository, identity, undefined, target)).rejects.toThrow();
  }
  expect(await readFile(path)).toStrictEqual(raw);
});

test.skipIf(process.platform === 'win32')(
  'rejects linked directories, file links, and nonprivate scratch',
  async () => {
    const { repository, scratch, path } = await fixture();
    await writeFile(path, raw);
    await symlink(scratch, join(repository, 'linked'));
    await symlink(path, join(scratch, 'linked.json'));
    const publicPath = join(roots.at(-1)!, 'public');
    await mkdir(publicPath, { mode: 0o755 });
    for (const target of [
      join(repository, 'linked', 'page.json'),
      join(scratch, 'linked.json'),
      join(publicPath, 'page.json'),
    ]) {
      await expect(prepareResponseFiles(repository, identity, target)).rejects.toThrow();
    }
  },
);
