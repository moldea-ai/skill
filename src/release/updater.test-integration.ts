// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'vitest';
import { z } from 'zod';

import { CLI_VERSION_RANGE_TEXT_PATHS, RELEASE_PATHS } from './constants.ts';
import { inspectReleaseIdentity, readReleaseIdentity } from './identity.ts';
import { updateCliRelease } from './updater.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..');
const SEMANTIC_CLI_EXECUTABLE_PATH = 'fixtures/tooling/semantic-cli/bin/moldea.js';
const UPDATE_PATHS = [
  ...new Set([
    ...CLI_VERSION_RANGE_TEXT_PATHS,
    ...Object.values(RELEASE_PATHS),
    'docs/compatibility-and-local-tooling.md',
    SEMANTIC_CLI_EXECUTABLE_PATH,
  ]),
];
const CompositionEnvelopeSchema = z.object({
  result: z.object({ adapters: z.array(z.object({ id: z.string() })) }),
  schemaVersion: z.number().int().positive(),
});

/** Creates a disposable copy of every file read or written by the CLI updater. */
const createTemporaryReleaseRoot = (): string => {
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
  (cliDependencies: Record<string, string>) =>
  ({
    packageLock,
    packageManifest,
    version,
  }: {
    packageLock: string;
    packageManifest: {
      devDependencies: Record<string, string>;
      moldeaRelease: { cliJsonSchemaVersion: number; coreVersionRange: string };
      version: string;
    };
    version: string;
  }): { packageLock: string; packageManifest: string } => {
    const updatedPackageLock = JSON.parse(packageLock) as {
      packages: Record<
        string,
        {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
          integrity?: string;
          version: string;
        }
      >;
    };
    const coreRange = cliDependencies['@moldea.ai/core'];
    if (coreRange === undefined) throw new Error('Synthetic CLI requires a Core dependency.');
    const coreMinimumVersion = coreRange.slice(1);
    const coreMajor = coreMinimumVersion.split('.')[0];
    const rootPackage = updatedPackageLock.packages[''];
    const cliPackage = updatedPackageLock.packages['node_modules/@moldea.ai/cli'];
    const corePackage = updatedPackageLock.packages['node_modules/@moldea.ai/core'];
    if (
      rootPackage?.devDependencies === undefined ||
      cliPackage === undefined ||
      corePackage === undefined
    ) {
      throw new Error('Synthetic package lock is missing the CLI closure.');
    }
    const existingCoreVersion = corePackage.version;
    const coreVersion = existingCoreVersion.startsWith(`${coreMajor}.`)
      ? existingCoreVersion
      : coreMinimumVersion;
    rootPackage.devDependencies['@moldea.ai/cli'] = version;
    updatedPackageLock.packages['node_modules/@moldea.ai/cli'] = {
      ...cliPackage,
      dependencies: cliDependencies,
      integrity: `sha512-${version}`,
      version,
    };
    updatedPackageLock.packages['node_modules/@moldea.ai/core'] = {
      ...corePackage,
      integrity: `sha512-${coreVersion}`,
      version: coreVersion,
    };

    return {
      packageLock: `${JSON.stringify(updatedPackageLock, null, 2)}\n`,
      packageManifest: `${JSON.stringify(packageManifest, null, 2)}\n`,
    };
  };

test('updateCliRelease synchronizes a complete copied release tree', () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const currentIdentity = readReleaseIdentity(REPOSITORY_ROOT);
  const nextVersion = '9.0.0';
  const nextCliJsonSchemaVersion = currentIdentity.cliJsonSchemaVersion + 1;
  const nextCliDependencies = Object.fromEntries(
    Object.entries(currentIdentity.cliDependencies).map(([name, versionRange]) => [
      name,
      name === '@moldea.ai/core'
        ? '^5.0.0'
        : versionRange.replace(/^\^?\d+/u, (major) => `^${Number(major.replace('^', '')) + 1}`),
    ]),
  );
  nextCliDependencies['@moldea.ai/adapter-future'] = '^1.0.0';

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
    for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
      assert.match(readFileSync(join(temporaryRoot, relativePath), 'utf8'), /\^9\.0\.0/u);
    }

    const composition = spawnSync(
      process.execPath,
      [join(temporaryRoot, SEMANTIC_CLI_EXECUTABLE_PATH), 'composition', '--json'],
      { cwd: temporaryRoot, encoding: 'utf8' },
    );
    const compositionEnvelope = CompositionEnvelopeSchema.parse(
      JSON.parse(composition.stdout) as unknown,
    );
    assert.equal(composition.status, 0, composition.stderr);
    assert.equal(compositionEnvelope.schemaVersion, nextCliJsonSchemaVersion);
    assert.ok(
      compositionEnvelope.result.adapters.some(({ id }) => id === 'future'),
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
  const nextVersion = '8.0.0';

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
            '@moldea.ai/repository': '0.0.0',
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
