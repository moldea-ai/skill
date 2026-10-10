// @vitest-environment node
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'vitest';

import {
  type IScopePathContext,
  normalizeScopePath,
  normalizeScopePathArguments,
  readScopePathInput,
} from './scope-path-input.ts';

const POSIX_CONTEXT: IScopePathContext = {
  repositoryRoot: '/work/project',
  resolvedRepositoryRoot: '/real/project',
};
const WINDOWS_CONTEXT: IScopePathContext = {
  repositoryRoot: 'D:\\work\\project',
  resolvedRepositoryRoot: 'C:\\real\\project',
};

test.each([
  ['src/agent.ts', '/src/agent.ts'],
  ['/src/agent.ts', '/src/agent.ts'],
  ['Src/Éclair plan.ts', '/Src/Éclair plan.ts'],
  ['./src/agent.ts', '/src/agent.ts'],
  ['././src/agent.ts', '/src/agent.ts'],
  ['/work/project/src/agent.ts', '/src/agent.ts'],
  ['/real/project/src/agent.ts', '/src/agent.ts'],
  ['/work/project/Src/Éclair plan.ts', '/Src/Éclair plan.ts'],
  ['/work/project-other/src/agent.ts', '/work/project-other/src/agent.ts'],
  ['/outside/src/agent.ts', '/outside/src/agent.ts'],
])('normalizeScopePath(%s) -> %s', (input, expected) => {
  assert.equal(normalizeScopePath(input, POSIX_CONTEXT), expected);
});

test.each([
  ['D:\\work\\project\\src\\agent.ts', '/src/agent.ts'],
  ['C:/real/project/src/agent.ts', '/src/agent.ts'],
  ['c:\\REAL\\PROJECT\\Src\\Éclair plan.ts', '/Src/Éclair plan.ts'],
  ['D:/work/project/src\\agent.ts', '/src/agent.ts'],
  ['src/agent.ts', '/src/agent.ts'],
  ['./src/agent.ts', '/src/agent.ts'],
  ['/src/agent.ts', '/src/agent.ts'],
])('normalizes Windows context path %s -> %s', (input, expected) => {
  assert.equal(normalizeScopePath(input, WINDOWS_CONTEXT), expected);
});

test.each([
  '',
  '.',
  './',
  '././',
  '/',
  './/src/agent.ts',
  '././/src/agent.ts',
  'src/agent.ts\0',
  'src/../agent.ts',
  'src/./agent.ts',
  '/work/project/../outside/agent.ts',
  '/work/project/src/../agent.ts',
  '/work/project',
  '/real/project',
  'src//agent.ts',
  'src/agent.ts/',
  'src\\agent.ts',
  'C:agent.ts',
  'C:/src/agent.ts',
  './C:/src/agent.ts',
  '\\\\host\\share',
  '//host/share',
  '\\\\?\\C:\\work\\project\\src\\agent.ts',
])('rejects a non-repository path %s', (input) =>
  assert.throws(() => normalizeScopePath(input, POSIX_CONTEXT), /Invalid scope path input/u),
);

test.each([
  'C:agent.ts',
  'E:\\outside\\agent.ts',
  'C:\\outside\\agent.ts',
  'C:\\real\\project-other\\agent.ts',
  'C:\\real\\project',
  'D:/work/project',
  'C:\\real\\project\\..\\agent.ts',
  'C:\\real\\project\\.\\agent.ts',
  'C:\\real\\project\\\\agent.ts',
  '\\\\server\\share\\agent.ts',
  '\\\\?\\C:\\real\\project\\agent.ts',
  '\\\\.\\C:\\real\\project\\agent.ts',
  'src\\agent.ts',
])('rejects unsafe Windows context path %s', (input) => {
  assert.throws(() => normalizeScopePath(input, WINDOWS_CONTEXT), /Invalid scope path input/u);
});

test('decodes a mixed batch without changing order, duplicates, casing, or Unicode', async () => {
  const input = Buffer.from(
    './Src/Éclair plan.ts\0/work/project/src/agent.ts\0Src/Éclair plan.ts\0',
  );
  const chunks = [input.subarray(0, 7), input.subarray(7, 12), input.subarray(12)];
  assert.deepEqual(await readScopePathInput(Readable.from(chunks), POSIX_CONTEXT), [
    '/Src/Éclair plan.ts',
    '/src/agent.ts',
    '/Src/Éclair plan.ts',
  ]);
});

test.each([
  Buffer.alloc(0),
  Buffer.from('src/agent.ts'),
  Buffer.from('\0src/agent.ts\0'),
  Buffer.from('src/agent.ts\0\0'),
  Buffer.from([0xff, 0]),
  Buffer.from('C:agent.ts\0'),
  Buffer.from('\\\\host\\share\0'),
])('rejects malformed stdin %o', async (input) => {
  await assert.rejects(
    readScopePathInput(Readable.from([input]), POSIX_CONTEXT),
    /Invalid scope path input/u,
  );
});

test('retains the input byte allowance when adding the logical prefix', async () => {
  const input = Buffer.alloc(2_097_152, 0x61);
  input[input.length - 1] = 0;
  const [path] = await readScopePathInput(Readable.from([input]), POSIX_CONTEXT);
  assert.ok(path !== undefined);
  assert.equal(Buffer.byteLength(path), input.length);
  assert.equal(path[0], '/');
});

test('stops consuming stdin when the original byte boundary is exceeded', async () => {
  let reads = 0;
  const inputStream = {
    async *[Symbol.asyncIterator]() {
      reads++;
      yield Buffer.alloc(2_097_152, 0x61);
      reads++;
      yield Buffer.from([0]);
      reads++;
      yield Buffer.from('must not be read');
    },
  };
  await assert.rejects(readScopePathInput(inputStream, POSIX_CONTEXT), /exceeds its byte limit/u);
  assert.equal(reads, 2);
});

test('argv byte limits count every original UTF-8 path and NUL delimiter', () => {
  assert.deepEqual(
    normalizeScopePathArguments(['./src/éclair plan.ts', '/work/project/src/a.ts'], POSIX_CONTEXT),
    ['/src/éclair plan.ts', '/src/a.ts'],
  );
  assert.equal(
    normalizeScopePathArguments(['a'.repeat(2_097_151)], POSIX_CONTEXT)[0]?.length,
    2_097_152,
  );
  assert.throws(
    () => normalizeScopePathArguments(['a'.repeat(2_097_151), 'b'], POSIX_CONTEXT),
    /exceeds/u,
  );
  assert.throws(
    () => normalizeScopePathArguments(['é'.repeat(1_048_576)], POSIX_CONTEXT),
    /exceeds/u,
  );
  assert.throws(() => normalizeScopePathArguments([], POSIX_CONTEXT), /Invalid/u);
  assert.throws(() => normalizeScopePathArguments([''], POSIX_CONTEXT), /Invalid/u);
});

test('counts absolute path bytes before removing the repository root', async () => {
  const prefix = `${POSIX_CONTEXT.repositoryRoot}/`;
  const path = prefix + 'a'.repeat(2_097_151 - Buffer.byteLength(prefix));
  const expected = `/${path.slice(prefix.length)}`;
  assert.deepEqual(normalizeScopePathArguments([path], POSIX_CONTEXT), [expected]);
  assert.deepEqual(
    await readScopePathInput(Readable.from([Buffer.from(`${path}\0`)]), POSIX_CONTEXT),
    [expected],
  );
  assert.throws(() => normalizeScopePathArguments([`${path}a`], POSIX_CONTEXT), /exceeds/u);
  await assert.rejects(
    readScopePathInput(Readable.from([Buffer.from(`${path}a\0`)]), POSIX_CONTEXT),
    /exceeds/u,
  );
});

test('normalizes a bounded batch with many leading relative dot segments', () => {
  const path = `${'./'.repeat(1_048_570)}a.ts`;
  assert.deepEqual(normalizeScopePathArguments([path], POSIX_CONTEXT), ['/a.ts']);
});
