import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { checkRepositoryPathPortability } from './path-portability.mjs';

const temporaryRoots = [];

const writeText = (root, relativePath, source) => {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source, 'utf8');
};

const createRepository = () => {
  const root = mkdtempSync(join(tmpdir(), 'moldea-path-portability-'));
  temporaryRoots.push(root);
  execFileSync('git', ['init', '--quiet'], { cwd: root });
  writeText(root, '.gitignore', 'ignored/**\n');
  writeText(root, 'docs/readme.md', 'Tracked.\n');
  writeText(root, 'src/untracked.mjs', 'export {};\n');
  writeText(root, 'ignored/very-long-name.txt', 'Ignored.\n');
  writeText(root, `_backup/${'x'.repeat(180)}.txt`, 'Excluded.\n');
  execFileSync('git', ['add', '.gitignore', 'docs/readme.md'], { cwd: root });
  return root;
};

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

test('checks tracked and non-ignored paths without entering excluded directories', () => {
  const root = createRepository();
  const result = checkRepositoryPathPortability(root);

  assert.equal(result.pathCount, 3);
  writeText(root, 'docs/README.md', 'Collision.\n');
  assert.throws(() => checkRepositoryPathPortability(root), /collide on Windows/u);
});
