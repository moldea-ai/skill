// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

import { generatePortableArtifacts } from './generation.ts';

const ROOT_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('portable generation reproduces every committed runtime', async () => {
  const result = await generatePortableArtifacts({ check: true, rootDirectory: ROOT_DIRECTORY });

  assert.equal(result.status, 'current');
  assert.deepEqual(result.artifacts, [
    'moldea/scripts/initialization-inspection.mjs',
    'moldea/scripts/repair-git.mjs',
    'moldea/scripts/managed-agents.mjs',
    'moldea/scripts/managed-readme.mjs',
    'moldea/scripts/moldea-cli.mjs',
    'moldea/scripts/moldea-cli.license.txt',
    'moldea/scripts/relevance-gate.mjs',
    'moldea/scripts/repository-files.mjs',
    'moldea/scripts/repository-package.mjs',
    'moldea/scripts/repository-package.license.txt',
    'moldea/scripts/manifest-scope.cjs',
    'moldea/scripts/manifest-scope.license.txt',
  ]);
  assert.match(
    readFileSync(path.join(ROOT_DIRECTORY, 'moldea/scripts/moldea-cli.license.txt'), 'utf8'),
    /^zod@4\.3\.6$/mu,
  );
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

test('portable bundles omit TypeScript and keep the matcher within its reviewed size cap', () => {
  for (const artifact of [
    'moldea/scripts/moldea-cli.license.txt',
    'moldea/scripts/repository-package.license.txt',
    'moldea/scripts/manifest-scope.license.txt',
  ]) {
    assert.doesNotMatch(
      readFileSync(path.join(ROOT_DIRECTORY, artifact), 'utf8'),
      /^typescript@/mu,
    );
  }
  const matcherPath = path.join(ROOT_DIRECTORY, 'moldea/scripts/manifest-scope.cjs');
  assert.ok(statSync(matcherPath).size <= 1_048_576);
  assert.doesNotMatch(readFileSync(matcherPath, 'utf8'), /node_modules\/typescript\//u);
});
