import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseSelectedEvidenceListing } from './release-evidence-source.mjs';

const objectId = 'a'.repeat(40);
const createRecord = (path, byteCount = 1, mode = '100644', objectType = 'blob') =>
  `${mode} ${objectType} ${objectId} ${byteCount}\t${path}\0`;
const allowAllPaths = () => true;

test('accepts a bounded regular-file listing and returns deterministic path order', () => {
  assert.deepEqual(
    parseSelectedEvidenceListing(
      `${createRecord('moldea/SKILL.md', 4)}${createRecord('fixtures/result.json', 8)}`,
      allowAllPaths,
    ),
    {
      entries: [
        {
          byteCount: 8,
          mode: '100644',
          objectId,
          path: 'fixtures/result.json',
        },
        { byteCount: 4, mode: '100644', objectId, path: 'moldea/SKILL.md' },
      ],
      totalByteCount: 12,
    },
  );
});

for (const { expectedError, limits, listing, name } of [
  {
    expectedError: /selection is empty/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 2, maximumTotalByteCount: 9 },
    listing: '',
    name: 'empty selection',
  },
  {
    expectedError: /1-file limit/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 1, maximumTotalByteCount: 9 },
    listing: createRecord('fixtures/one.json') + createRecord('fixtures/two.json'),
    name: 'file-count overflow',
  },
  {
    expectedError: /8-byte limit/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 2, maximumTotalByteCount: 9 },
    listing: createRecord('fixtures/large.json', 9),
    name: 'per-file overflow',
  },
  {
    expectedError: /9-byte total/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 2, maximumTotalByteCount: 9 },
    listing: createRecord('fixtures/one.json', 5) + createRecord('fixtures/two.json', 5),
    name: 'aggregate overflow',
  },
  {
    expectedError: /unsupported mode/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 2, maximumTotalByteCount: 9 },
    listing: createRecord('fixtures/link', 1, '120000'),
    name: 'symbolic link',
  },
  {
    expectedError: /unsupported object type/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 2, maximumTotalByteCount: 9 },
    listing: createRecord('fixtures/tree', 1, '100644', 'tree'),
    name: 'non-blob object',
  },
  {
    expectedError: /duplicate paths/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 2, maximumTotalByteCount: 9 },
    listing: createRecord('fixtures/result.json') + createRecord('fixtures/result.json'),
    name: 'duplicate path',
  },
  ...[
    '../escape.json',
    'con.json',
    'fixtures/invalid?.json',
    `fixtures/${'é'.repeat(33)}.json`,
  ].map((path) => ({
    expectedError: /safe repository-relative path/u,
    limits: { maximumFileByteCount: 8, maximumFileCount: 2, maximumTotalByteCount: 9 },
    listing: createRecord(path),
    name: `unsafe path ${path}`,
  })),
]) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => parseSelectedEvidenceListing(listing, allowAllPaths, limits),
      expectedError,
    );
  });
}

test('rejects paths outside the section allowlist', () => {
  assert.throws(
    () => parseSelectedEvidenceListing(createRecord('unrelated.txt'), () => false),
    /unapproved path/u,
  );
});
