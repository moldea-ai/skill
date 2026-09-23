// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
    'moldea/scripts/repository-package.license.txt',
    'moldea/scripts/manifest-scope.cjs',
    'moldea/scripts/manifest-scope.license.txt',
  ]);
  const resolver = readFileSync(
    path.join(ROOT_DIRECTORY, 'moldea', 'scripts', 'repository-package.mjs'),
    'utf8',
  );
  const notices = readFileSync(
    path.join(ROOT_DIRECTORY, 'moldea', 'scripts', 'repository-package.license.txt'),
    'utf8',
  );
  assert.match(resolver, /See repository-package\.license\.txt/u);
  assert.doesNotMatch(resolver, /from ["']semver["']/u);
  assert.match(notices, /^semver@7\.8\.5$/mu);
  assert.match(notices, /^zod@4\.3\.6$/mu);
});
