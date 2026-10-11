// @vitest-environment node
import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { assertNoWindowsCaseFoldCollisions, assertPortableRepositoryPath } from './paths.ts';

describe('path portability', () => {
  test('accepts bounded semantic storage paths', () => {
    assert.doesNotThrow(() =>
      assertPortableRepositoryPath(
        '.evidence/semantic/results/attempts/sem-20261011000000000-01234567/evidence.json',
      ),
    );
  });

  test('rejects traversal, Windows devices, invalid characters, and byte overflows', () => {
    for (const path of [
      '../outside.txt',
      'docs\\outside.txt',
      'docs/con.txt',
      'docs/name?.txt',
      'docs/trailing.',
      `docs/${'a'.repeat(65)}.txt`,
      `docs/${'a'.repeat(155)}.txt`,
    ]) {
      assert.throws(() => assertPortableRepositoryPath(path));
    }
  });

  test('measures UTF-8 bytes instead of JavaScript character count', () => {
    assert.throws(() => assertPortableRepositoryPath(`docs/${'\u00e9'.repeat(32)}x.md`));
  });

  test('rejects Windows case-fold collisions', () => {
    assert.throws(
      () => assertNoWindowsCaseFoldCollisions(['docs/readme.md', 'docs/README.md']),
      /collide on Windows/u,
    );
  });
});
