// @vitest-environment node
import { expect, test } from 'vitest';

import { changedPaths, inspectPatch } from './reconstruction.ts';

test.each(['120000', '160000', '040000', '120000\r', '120000 '])(
  'inspectPatch rejects non-regular mode %s before application',
  (mode) => {
    expect(() =>
      inspectPatch(`diff --git a/link b/link\nnew file mode ${mode}\n--- /dev/null\n+++ b/link\n`),
    ).toThrow(/mode/u);
  },
);
test.each([
  '../outside',
  '/outside',
  '.git/config',
  '.agents/skills/attack',
  'node_modules/attack',
  'nul.txt',
  '_archive/hidden',
])('inspectPatch rejects unsafe path %s', (name) => {
  expect(() => inspectPatch(`diff --git a/${name} b/${name}\n`)).toThrow();
});
test('changedPaths includes additions, changes, and deletions', () => {
  expect(changedPaths({ a: '1', b: '2' }, { a: '3', c: '4' })).toStrictEqual(['a', 'b', 'c']);
});
