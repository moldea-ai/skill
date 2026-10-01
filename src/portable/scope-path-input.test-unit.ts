// @vitest-environment node
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { test } from 'vitest';

import { normalizeScopePath, readScopePathInput } from './scope-path-input.ts';

test.each([
  ['src/agent.ts', '/src/agent.ts'],
  ['/src/agent.ts', '/src/agent.ts'],
  ['Src/Éclair plan.ts', '/Src/Éclair plan.ts'],
  ['src/../agent.ts', '/src/../agent.ts'],
])('normalizeScopePath(%s) -> %s', (input, expected) => {
  assert.equal(normalizeScopePath(input), expected);
});

test.each(['', 'src/agent.ts\0', 'C:agent.ts', 'C:/src/agent.ts', '\\\\host\\share'])(
  'rejects a non-repository path %s',
  (input) => assert.throws(() => normalizeScopePath(input), /Invalid scope path input/u),
);

test('decodes a mixed batch without changing order, duplicates, casing, or Unicode', async () => {
  const input = Buffer.from('Src/Éclair plan.ts\0/src/agent.ts\0Src/Éclair plan.ts\0');
  const chunks = [input.subarray(0, 5), input.subarray(5, 12), input.subarray(12)];
  assert.deepEqual(await readScopePathInput(Readable.from(chunks)), [
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
  await assert.rejects(readScopePathInput(Readable.from([input])), /Invalid scope path input/u);
});

test('retains the input byte allowance when adding the logical prefix', async () => {
  const input = Buffer.alloc(2_097_152, 0x61);
  input[input.length - 1] = 0;
  const [path] = await readScopePathInput(Readable.from([input]));
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
  await assert.rejects(readScopePathInput(inputStream), /exceeds its byte limit/u);
  assert.equal(reads, 2);
});
