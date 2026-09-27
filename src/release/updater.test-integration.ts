// @vitest-environment node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { satisfies } from 'semver';
import { test } from 'vitest';
import { z } from 'zod';

import { generatePortableArtifacts, PORTABLE_ARTIFACT_PATHS } from '../portable/index.ts';

import { CLI_VERSION_RANGE_TEXT_PATHS, RELEASE_PATHS } from './constants.ts';
import { inspectReleaseIdentity, readReleaseIdentity } from './identity.ts';
import { updateCliRelease } from './updater.ts';

const REPOSITORY_ROOT = resolve(import.meta.dirname, '..', '..');
const SEMANTIC_CLI_EXECUTABLE_PATH = 'fixtures/tooling/semantic-cli/bin/moldea.js';
const BUNDLED_PACKAGES = [
  '@moldea.ai/core',
  '@moldea.ai/repository',
  'error-message-utils',
  'semver',
  'yaml',
  'zod',
] as const;
const UPDATE_PATHS = [
  ...new Set([
    ...CLI_VERSION_RANGE_TEXT_PATHS,
    ...Object.values(RELEASE_PATHS),
    ...PORTABLE_ARTIFACT_PATHS,
    'docs/compatibility-and-local-tooling.md',
    'moldea/assets/managed-readme-block.md',
    'qualification/package.json',
    'website/package.json',
    SEMANTIC_CLI_EXECUTABLE_PATH,
  ]),
];
const CompositionEnvelopeSchema = z.object({
  cliVersion: z.string(),
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
  cpSync(join(REPOSITORY_ROOT, 'src/portable'), join(temporaryRoot, 'src/portable'), {
    recursive: true,
    filter: (sourcePath) =>
      !['_archive', '_archives', '_backup', '_backups'].includes(basename(sourcePath)),
  });
  return temporaryRoot;
};

/** Gives the staged generator a synthetic dependency closure matching its test lock. */
const installSyntheticDependencies = (temporaryRoot: string): void => {
  const lock = JSON.parse(readFileSync(join(temporaryRoot, RELEASE_PATHS.packageLock), 'utf8')) as {
    packages: Record<string, { version?: string }>;
  };
  for (const packageName of BUNDLED_PACKAGES) {
    const relativePath = join('node_modules', packageName);
    const destination = join(temporaryRoot, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(join(REPOSITORY_ROOT, relativePath), destination, {
      dereference: true,
      recursive: true,
      filter: (sourcePath) =>
        !['_archive', '_archives', '_backup', '_backups'].includes(basename(sourcePath)),
    });
    const manifestPath = join(destination, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version: string };
    const lockedVersion = lock.packages[relativePath]?.version;
    if (lockedVersion === undefined) throw new Error(`Missing lock version for ${packageName}.`);
    if (manifest.version !== lockedVersion) {
      writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, version: lockedVersion })}\n`);
    }
  }
};

/** Installs inert CLI/Core metadata so the shipped launcher can execute its real lookup path. */
const installSyntheticRuntime = (
  temporaryRoot: string,
  cliVersion: string,
  cliDependencies: Record<string, string>,
  schemaVersion: number,
): void => {
  const cliRoot = join(temporaryRoot, 'node_modules/@moldea.ai/cli');
  const coreRoot = join(temporaryRoot, 'node_modules/@moldea.ai/core');
  mkdirSync(join(cliRoot, 'dist'), { recursive: true });
  mkdirSync(join(coreRoot, 'dist'), { recursive: true });
  writeFileSync(
    join(cliRoot, 'package.json'),
    `${JSON.stringify({
      bin: { moldea: './dist/moldea.js' },
      dependencies: cliDependencies,
      moldeaRelease: { cliJsonSchemaVersion: schemaVersion },
      name: '@moldea.ai/cli',
      version: cliVersion,
    })}\n`,
  );
  cpSync(join(temporaryRoot, SEMANTIC_CLI_EXECUTABLE_PATH), join(cliRoot, 'dist/moldea.js'));
  writeFileSync(
    join(coreRoot, 'package.json'),
    `${JSON.stringify({ name: '@moldea.ai/core', version: cliDependencies['@moldea.ai/core']?.slice(1) })}\n`,
  );
  writeFileSync(join(coreRoot, 'dist/index.js'), '');
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
    const coreVersion = satisfies(existingCoreVersion, coreRange)
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

test('updateCliRelease synchronizes a complete copied release tree', async () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const originalRootManifest = JSON.parse(
    readFileSync(join(temporaryRoot, RELEASE_PATHS.packageManifest), 'utf8'),
  ) as Record<string, unknown>;
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
    const identity = await updateCliRelease({
      repositoryRoot: temporaryRoot,
      version: nextVersion,
      resolveManifest: () => ({
        dependencies: nextCliDependencies,
        jsonSchemaVersion: nextCliJsonSchemaVersion,
        version: nextVersion,
      }),
      updateRootManifests: createRootManifestUpdater(nextCliDependencies),
      installDependencies: installSyntheticDependencies,
    });

    assert.equal(identity.cliVersion, nextVersion);
    assert.equal(identity.cliJsonSchemaVersion, nextCliJsonSchemaVersion);
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);
    const updatedRootManifest = JSON.parse(
      readFileSync(join(temporaryRoot, RELEASE_PATHS.packageManifest), 'utf8'),
    ) as Record<string, unknown>;
    for (const field of ['name', 'workspaces', 'engines', 'scripts']) {
      assert.notEqual(originalRootManifest[field], undefined);
      assert.deepEqual(updatedRootManifest[field], originalRootManifest[field]);
    }
    assert.match(
      readFileSync(join(temporaryRoot, RELEASE_PATHS.skill), 'utf8'),
      new RegExp(`cliJsonSchemaVersion: '${nextCliJsonSchemaVersion}'`, 'u'),
    );
    for (const relativePath of CLI_VERSION_RANGE_TEXT_PATHS) {
      assert.match(readFileSync(join(temporaryRoot, relativePath), 'utf8'), /\^9\.0\.0/u);
    }
    assert.match(
      readFileSync(join(temporaryRoot, RELEASE_PATHS.skillRepositoryPackage), 'utf8'),
      /EXPECTED_CLI_RANGE = "\^9\.0\.0"/u,
    );

    installSyntheticRuntime(
      temporaryRoot,
      nextVersion,
      nextCliDependencies,
      nextCliJsonSchemaVersion,
    );
    const launchedComposition = spawnSync(
      process.execPath,
      [
        join(temporaryRoot, RELEASE_PATHS.skillCliLauncher),
        '--repository',
        temporaryRoot,
        '--',
        'composition',
        '--json',
      ],
      { cwd: temporaryRoot, encoding: 'utf8' },
    );
    assert.equal(launchedComposition.status, 0, launchedComposition.stderr);
    const launchedEnvelope = CompositionEnvelopeSchema.parse(
      JSON.parse(launchedComposition.stdout) as unknown,
    );
    assert.equal(launchedEnvelope.cliVersion, nextVersion);
    assert.equal(launchedEnvelope.schemaVersion, nextCliJsonSchemaVersion);

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

test('updateCliRelease accepts a higher same-major Core declaration minimum', async () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const currentIdentity = readReleaseIdentity(REPOSITORY_ROOT);
  const cliDependencies = {
    ...currentIdentity.cliDependencies,
    '@moldea.ai/core': '^5.0.1',
  };

  try {
    const identity = await updateCliRelease({
      repositoryRoot: temporaryRoot,
      version: '9.0.1',
      resolveManifest: () => ({
        dependencies: cliDependencies,
        jsonSchemaVersion: currentIdentity.cliJsonSchemaVersion,
        version: '9.0.1',
      }),
      updateRootManifests: createRootManifestUpdater(cliDependencies),
      installDependencies: installSyntheticDependencies,
    });

    assert.equal(identity.cliCoreVersionRange, '^5.0.1');
    assert.equal(identity.coreVersionRange, '^5.0.0');
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);
    assert.match(
      readFileSync(join(temporaryRoot, RELEASE_PATHS.skill), 'utf8'),
      /cliJsonSchemaVersion: '5'/u,
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('updateCliRelease preserves the supported Core range when the CLI minimum rises again', async () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const semanticCliManifestPath = join(temporaryRoot, RELEASE_PATHS.semanticCliManifest);
  const semanticCliManifest = JSON.parse(readFileSync(semanticCliManifestPath, 'utf8')) as {
    dependencies: Record<string, string>;
  };
  const packageLockPath = join(temporaryRoot, RELEASE_PATHS.packageLock);
  const packageLock = JSON.parse(readFileSync(packageLockPath, 'utf8')) as {
    packages: Record<
      string,
      { dependencies?: Record<string, string>; integrity?: string; version: string }
    >;
  };
  const lockedCli = packageLock.packages['node_modules/@moldea.ai/cli'];
  const lockedCore = packageLock.packages['node_modules/@moldea.ai/core'];
  assert.ok(lockedCli?.dependencies && lockedCore);
  semanticCliManifest.dependencies['@moldea.ai/core'] = '^5.0.0';
  lockedCli.dependencies['@moldea.ai/core'] = '^5.0.0';
  lockedCore.version = '5.1.0';
  lockedCore.integrity = 'sha512-5.1.0';
  writeFileSync(semanticCliManifestPath, `${JSON.stringify(semanticCliManifest, null, 2)}\n`);
  writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);

  try {
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);
    const currentIdentity = readReleaseIdentity(temporaryRoot);
    const cliDependencies = {
      ...currentIdentity.cliDependencies,
      '@moldea.ai/core': '^5.1.0',
    };

    const identity = await updateCliRelease({
      repositoryRoot: temporaryRoot,
      version: '9.0.1',
      resolveManifest: () => ({
        dependencies: cliDependencies,
        jsonSchemaVersion: currentIdentity.cliJsonSchemaVersion,
        version: '9.0.1',
      }),
      updateRootManifests: createRootManifestUpdater(cliDependencies),
      installDependencies: installSyntheticDependencies,
    });

    assert.equal(identity.cliCoreVersionRange, '^5.1.0');
    assert.equal(identity.coreVersionRange, '^5.0.0');
    assert.deepEqual(inspectReleaseIdentity(temporaryRoot), []);
    assert.match(
      readFileSync(join(temporaryRoot, RELEASE_PATHS.readme), 'utf8'),
      /stable `@moldea\.ai\/core` releases satisfying `\^5\.0\.0`/u,
    );
    assert.match(
      readFileSync(join(temporaryRoot, RELEASE_PATHS.skillLocalTooling), 'utf8'),
      /stable `@moldea\.ai\/core` releases satisfying `\^5\.0\.0`/u,
    );
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('updateCliRelease restores every managed file after failed identity verification', async () => {
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
    await assert.rejects(
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
        installDependencies: installSyntheticDependencies,
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

test('updateCliRelease leaves the repository unchanged when generation fails', async () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const originalFiles = new Map(
    UPDATE_PATHS.map((relativePath) => [
      relativePath,
      readFileSync(join(temporaryRoot, relativePath), 'utf8'),
    ]),
  );
  const currentIdentity = readReleaseIdentity(REPOSITORY_ROOT);

  try {
    await assert.rejects(
      updateCliRelease({
        repositoryRoot: temporaryRoot,
        version: '8.0.1',
        resolveManifest: () => ({
          dependencies: currentIdentity.cliDependencies,
          jsonSchemaVersion: currentIdentity.cliJsonSchemaVersion,
          version: '8.0.1',
        }),
        updateRootManifests: createRootManifestUpdater(currentIdentity.cliDependencies),
        installDependencies: installSyntheticDependencies,
        generateArtifacts: async () => {
          throw new Error('Synthetic generation failure.');
        },
      }),
      /Synthetic generation failure/u,
    );
    for (const [relativePath, originalContent] of originalFiles) {
      assert.equal(readFileSync(join(temporaryRoot, relativePath), 'utf8'), originalContent);
    }
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('updateCliRelease preserves an externally changed artifact and restores its own writes', async () => {
  const temporaryRoot = createTemporaryReleaseRoot();
  const originalFiles = new Map(
    UPDATE_PATHS.map((relativePath) => [
      relativePath,
      readFileSync(join(temporaryRoot, relativePath), 'utf8'),
    ]),
  );
  const currentIdentity = readReleaseIdentity(REPOSITORY_ROOT);
  const conflictedPath = PORTABLE_ARTIFACT_PATHS[0];
  const externalContent = 'external artifact change\n';

  try {
    await assert.rejects(
      updateCliRelease({
        repositoryRoot: temporaryRoot,
        version: '8.0.1',
        resolveManifest: () => ({
          dependencies: currentIdentity.cliDependencies,
          jsonSchemaVersion: currentIdentity.cliJsonSchemaVersion,
          version: '8.0.1',
        }),
        updateRootManifests: createRootManifestUpdater(currentIdentity.cliDependencies),
        installDependencies: installSyntheticDependencies,
        generateArtifacts: async (options) => {
          const result = await generatePortableArtifacts(options);
          writeFileSync(join(temporaryRoot, conflictedPath), externalContent);
          return result;
        },
      }),
      /changed while the CLI update was being applied/u,
    );
    for (const [relativePath, originalContent] of originalFiles) {
      assert.equal(
        readFileSync(join(temporaryRoot, relativePath), 'utf8'),
        relativePath === conflictedPath ? externalContent : originalContent,
      );
    }
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
