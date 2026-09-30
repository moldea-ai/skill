// @vitest-environment node
import { expect, test } from 'vitest';

import { buildRecordedFileTreeRows } from './utilities.ts';

test('an empty recorded change has no invented file or directory rows', () => {
  expect(buildRecordedFileTreeRows([])).toStrictEqual([]);
});

test('single-child folders collapse while file paths and statuses remain intact', () => {
  expect(
    buildRecordedFileTreeRows([
      { path: 'moldea/agents/support/instruction.md', status: 'created' },
      { path: 'moldea/agents/support/obsolete.md', status: 'deleted' },
    ]),
  ).toStrictEqual([
    { depth: 0, kind: 'folder', name: 'moldea/agents/support/', path: 'moldea/agents/support' },
    {
      depth: 1,
      kind: 'file',
      name: 'instruction.md',
      path: 'moldea/agents/support/instruction.md',
      status: 'created',
    },
    {
      depth: 1,
      kind: 'file',
      name: 'obsolete.md',
      path: 'moldea/agents/support/obsolete.md',
      status: 'deleted',
    },
  ]);
});

test('branching folders retain their hierarchy and identically named files retain their statuses', () => {
  const rows = buildRecordedFileTreeRows([
    { path: 'src/support/agent.ts', status: 'modified' },
    { path: 'src/admin/agent.ts', status: 'created' },
    { path: 'src/index.ts', status: 'deleted' },
    { path: 'package.json', status: 'modified' },
  ]);
  expect(rows.filter(({ kind }) => kind === 'file')).toStrictEqual([
    { depth: 0, kind: 'file', name: 'package.json', path: 'package.json', status: 'modified' },
    { depth: 2, kind: 'file', name: 'agent.ts', path: 'src/admin/agent.ts', status: 'created' },
    { depth: 1, kind: 'file', name: 'index.ts', path: 'src/index.ts', status: 'deleted' },
    { depth: 2, kind: 'file', name: 'agent.ts', path: 'src/support/agent.ts', status: 'modified' },
  ]);
  expect(rows.filter(({ kind }) => kind === 'folder')).toStrictEqual([
    { depth: 0, kind: 'folder', name: 'src/', path: 'src' },
    { depth: 1, kind: 'folder', name: 'admin/', path: 'src/admin' },
    { depth: 1, kind: 'folder', name: 'support/', path: 'src/support' },
  ]);
});

test('a long recorded filename is preserved without shortening its accessible source path', () => {
  const path = 'src/support-agent.test-integration.js';
  expect(buildRecordedFileTreeRows([{ path, status: 'modified' }]).at(-1)).toStrictEqual({
    depth: 1,
    kind: 'file',
    name: 'support-agent.test-integration.js',
    path,
    status: 'modified',
  });
});
