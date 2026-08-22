// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import { CLI_VERSION_TEXT_PATHS, RELEASE_PATHS } from './constants.mjs';
import { inspectReleaseIdentity, readReleaseIdentity } from './identity.mjs';
import { updateCliRelease } from './updater.mjs';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..');
const SEMANTIC_CLI_EXECUTABLE_PATH = 'fixtures/tooling/semantic-cli/bin/moldea.js';
const UPDATE_PATHS = [
  ...new Set([
    ...CLI_VERSION_TEXT_PATHS,
    ...Object.values(RELEASE_PATHS).filter(
      (relativePath) => relativePath !== RELEASE_PATHS.semanticResult,
    ),
    'docs/compatibility-and-local-tooling.md',
    SEMANTIC_CLI_EXECUTABLE_PATH,
  ]),
];

/** Creates a disposable copy of every file read or written by the CLI updater. */
const createTemporaryReleaseRoot = () => {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'moldea-release-update-'));

  for (const relativePath of UPDATE_PATHS) {
    const sourcePath = join(REPOSITORY_ROOT, relativePath);
    const destinationPath = join(temporaryRoot, relativePath);
    mkdirSync(dirname(destinationPath), { recursive: true });
    cpSync(sourcePath, destinationPath);
  }

  return temporaryRoot;
};

/** Produces deterministic npm-owned manifest output without contacting the registry. */
const createRootManifestUpdater =
  (cliDependencies) =>
  ({ packageLock, packageManifest, version }) => {
    const updatedPackageLock = JSON.parse(packageLock);
    updatedPackageLock.packages[''].devDependencies['@moldea.ai/cli'] = version;
    updatedPackageLock.packages['node_modules/@moldea.ai/cli'] = {
      ...updatedPackageLock.packages['node_modules/@moldea.ai/cli'],
      dependencies: cliDependencies,
      integrity: `sha512-${version}`,
      version,
    };

    return {
      packageLock: `${JSON.stringify(updatedPackageLock, null, 2)}\n`,
      packageManifest: `${JSON.stringify(packageManifest, null, 2)}\n`,
    };
  };

test('updateCliRelease synchronizes a complete copied release tree', () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const currentIdentity = readReleaseIdentity(REPOSITORY_ROOT);
  const nextVersion = '3.3.8';
  const nextCliJsonSchemaVersion = currentIdentity.cliJsonSchemaVersion + 1;
  const nextCliDependencies = {
    ...currentIdentity.cliDependencies,
    '@moldea.ai/adapter-future': '1.0.0',
  };

  try {
    const identity = updateCliRelease({
      repositoryRoot: temporaryRoot,
      version: nextVersion,
      resolveManifest: () => ({
        dependencies: nextCliDependencies,
        jsonSchemaVersion: nextCliJsonSchemaVersion,
        version: nextVersion,
      }),
      updateRootManifests: createRootManifestUpdater(nextCliDependencies),
    });

    assert.equal(identity.cliVersion, nextVersion);
    assert.equal(identity.cliJsonSchemaVersion, nextCliJsonSchemaVersion);
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);
    for (const relativePath of CLI_VERSION_TEXT_PATHS) {
      assert.equal(
        readFileSync(join(temporaryRoot, relativePath), 'utf8').includes(
          currentIdentity.cliVersion,
        ),
        false,
      );
    }

    const compatibility = spawnSync(
      process.execPath,
      [join(temporaryRoot, SEMANTIC_CLI_EXECUTABLE_PATH), 'compatibility', '--json'],
      { cwd: temporaryRoot, encoding: 'utf8' },
    );
    const compatibilityEnvelope = JSON.parse(compatibility.stdout);
    assert.equal(compatibility.status, 0, compatibility.stderr);
    assert.equal(compatibilityEnvelope.schemaVersion, nextCliJsonSchemaVersion);
    assert.ok(
      compatibilityEnvelope.result.adapters.some(({ id }) => id === 'future'),
      'The synthetic CLI must derive newly published adapters from its dependency inventory.',
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('updateCliRelease restores every managed file after failed identity verification', () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const originalFiles = new Map(
    UPDATE_PATHS.map((relativePath) => [
      relativePath,
      readFileSync(join(temporaryRoot, relativePath), 'utf8'),
    ]),
  );
  const currentIdentity = readReleaseIdentity(REPOSITORY_ROOT);
  const nextVersion = '3.3.8';

  try {
    assert.throws(
      () =>
        updateCliRelease({
          repositoryRoot: temporaryRoot,
          version: nextVersion,
          resolveManifest: () => ({
            dependencies: currentIdentity.cliDependencies,
            jsonSchemaVersion: currentIdentity.cliJsonSchemaVersion,
            version: nextVersion,
          }),
          updateRootManifests: createRootManifestUpdater({
            ...currentIdentity.cliDependencies,
            '@moldea.ai/core': '0.0.0',
          }),
        }),
      /dependency inventory does not match/u,
    );

    for (const [relativePath, originalContent] of originalFiles) {
      assert.equal(readFileSync(join(temporaryRoot, relativePath), 'utf8'), originalContent);
    }
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
