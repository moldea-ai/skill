// @vitest-environment node
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import { RELEASE_PATHS } from './constants.mjs';
import { inspectReleaseIdentity, readReleaseIdentity } from './identity.mjs';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..');
const IDENTITY_PATHS = [
  ...Object.values(RELEASE_PATHS).filter(
    (relativePath) => relativePath !== RELEASE_PATHS.semanticResult,
  ),
  'docs/compatibility-and-local-tooling.md',
];

test('release identity inspection detects a stale maintained copy', () => {
  assert.deepEqual(inspectReleaseIdentity(REPOSITORY_ROOT), []);
  const { cliVersion } = readReleaseIdentity(REPOSITORY_ROOT);
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-release-identity-'));

  try {
    for (const relativePath of IDENTITY_PATHS) {
      const sourcePath = join(REPOSITORY_ROOT, relativePath);
      const destinationPath = join(temporaryRoot, relativePath);
      mkdirSync(dirname(destinationPath), { recursive: true });
      cpSync(sourcePath, destinationPath);
    }

    const semanticCliManifestPath = join(
      temporaryRoot,
      'fixtures',
      'tooling',
      'semantic-cli',
      'package.json',
    );
    const semanticCliManifest = JSON.parse(readFileSync(semanticCliManifestPath, 'utf8'));
    const reorderedSemanticCliManifest = {
      ...semanticCliManifest,
      dependencies: Object.fromEntries(Object.entries(semanticCliManifest.dependencies).reverse()),
    };
    writeFileSync(
      semanticCliManifestPath,
      `${JSON.stringify(reorderedSemanticCliManifest, null, 2)}\n`,
      'utf8',
    );
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);

    writeFileSync(
      semanticCliManifestPath,
      `${JSON.stringify(
        {
          ...reorderedSemanticCliManifest,
          moldeaRelease: { cliJsonSchemaVersion: 999 },
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), [
      `The semantic CLI fixture JSON schema version is not ${semanticCliManifest.moldeaRelease.cliJsonSchemaVersion}.`,
    ]);
    writeFileSync(
      semanticCliManifestPath,
      `${JSON.stringify(reorderedSemanticCliManifest, null, 2)}\n`,
      'utf8',
    );

    const compatibilityPath = join(temporaryRoot, 'docs', 'compatibility-and-local-tooling.md');
    writeFileSync(
      compatibilityPath,
      readFileSync(compatibilityPath, 'utf8').replace(
        `@moldea.ai/cli ${cliVersion}`,
        '@moldea.ai/cli 0.0.0',
      ),
      'utf8',
    );

    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), [
      `docs/compatibility-and-local-tooling.md is missing: - \`@moldea.ai/cli ${cliVersion}\``,
    ]);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
