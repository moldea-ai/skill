// @vitest-environment node
import assert from 'node:assert/strict';
import test from 'node:test';

import { CLI_VERSION_TEXT_PATHS, RELEASE_PATHS } from './constants.mjs';
import { createCliReleaseUpdate } from './updater.mjs';

test('createCliReleaseUpdate synchronizes every CLI-owned release file', () => {
  const currentFiles = new Map(
    CLI_VERSION_TEXT_PATHS.map((relativePath) => [relativePath, `${relativePath}: 3.3.7\n`]),
  );
  currentFiles.set(RELEASE_PATHS.packageManifest, '{}\n');
  currentFiles.set(RELEASE_PATHS.packageLock, '{}\n');
  currentFiles.set(
    RELEASE_PATHS.semanticCliManifest,
    `${JSON.stringify({ bin: { moldea: 'bin/moldea.js' }, name: '@moldea.ai/cli', private: true, version: '3.3.7' }, null, 2)}\n`,
  );

  const updatedFiles = createCliReleaseUpdate({
    currentFiles,
    previousCliVersion: '3.3.7',
    publishedManifest: {
      dependencies: { '@moldea.ai/core': '2.0.2' },
      version: '3.3.8',
    },
    updatedRootManifests: {
      packageLock: '{"lockfileVersion":3}\n',
      packageManifest: '{"version":"3.1.0"}\n',
    },
  });

  for (const relativePath of CLI_VERSION_TEXT_PATHS) {
    assert.equal(updatedFiles.get(relativePath), `${relativePath}: 3.3.8\n`);
  }
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageLock), '{"lockfileVersion":3}\n');
  assert.equal(updatedFiles.get(RELEASE_PATHS.packageManifest), '{"version":"3.1.0"}\n');
  assert.deepEqual(JSON.parse(updatedFiles.get(RELEASE_PATHS.semanticCliManifest)), {
    bin: { moldea: 'bin/moldea.js' },
    dependencies: { '@moldea.ai/core': '2.0.2' },
    name: '@moldea.ai/cli',
    private: true,
    version: '3.3.8',
  });
});
