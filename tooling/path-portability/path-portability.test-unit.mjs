import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  assertNoWindowsCaseFoldCollisions,
  assertPortableRepositoryPath,
  assertQualificationStoragePath,
  createWorstCaseQualificationPaths,
} from './path-portability.mjs';

describe('path portability', () => {
  test('accepts current and worst-case short qualification paths', () => {
    const paths = [
      'qualification/profiles/t14/cases/c10/scenario.yaml',
      'qualification/results/t14/attempts/a-0123456789abcdef0123456789abcdef/artifacts/f131.jsonl',
      ...createWorstCaseQualificationPaths(),
    ];

    for (const path of paths) {
      assert.doesNotThrow(() => assertPortableRepositoryPath(path));
      assert.doesNotThrow(() => assertQualificationStoragePath(path));
    }
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

  test('rejects invalid qualification storage keys and expanded results', () => {
    for (const path of [
      'qualification/profiles/custom/profile.yaml',
      'qualification/profiles/t1/cases/expanded-case/scenario.yaml',
      'qualification/results/custom/latest.json',
      'qualification/results/t1/attempts/attempt-long/attempt.json',
      'qualification/results/t1/attempts/a-0123456789abcdef0123456789abcdef/cases/c1.json',
    ]) {
      assert.throws(() => assertQualificationStoragePath(path));
    }
  });
});
