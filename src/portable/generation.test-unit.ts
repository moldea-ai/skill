// @vitest-environment node
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

import { generatePortableArtifacts } from './generation.ts';

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('portable generation reproduces every committed runtime', async () => {
  const result = await generatePortableArtifacts({ check: true, rootDirectory: ROOT_DIRECTORY });

  assert.equal(result.status, 'current');
  assert.deepEqual(result.artifacts, [
    'moldea/scripts/managed-readme.mjs',
    'moldea/scripts/moldea-cli.mjs',
    'moldea/scripts/relevance-gate.mjs',
    'moldea/scripts/repository-files.mjs',
    'moldea/scripts/repository-package.mjs',
    'moldea/scripts/manifest-scope.cjs',
    'moldea/scripts/manifest-scope.license.txt',
  ]);
});
