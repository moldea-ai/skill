// @vitest-environment node
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'vitest';

import { createCliClosureDigest, createCliClosureIdentity } from './closure.ts';

type IFixturePackageManifest = {
  devDependencies: Record<string, string>;
  moldeaRelease: { cliJsonSchemaVersion: number };
  name: string;
  version: string;
};

type IFixturePackageRecord = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  integrity?: string;
  name?: string;
  version: string;
};

type IFixturePackageLock = {
  lockfileVersion: number;
  name: string;
  packages: Record<string, IFixturePackageRecord>;
  version: string;
};

const temporaryRoots: string[] = [];

const createRepository = (): {
  packageLock: IFixturePackageLock;
  packageManifest: IFixturePackageManifest;
  repositoryRoot: string;
} => {
  const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-cli-closure-'));
  temporaryRoots.push(repositoryRoot);
  const packageManifest: IFixturePackageManifest = {
    name: 'fixture',
    version: '5.0.0',
    moldeaRelease: { cliJsonSchemaVersion: 2 },
    devDependencies: { '@moldea.ai/cli': '5.0.0', unrelated: '9.0.0' },
  };
  const packageLock: IFixturePackageLock = {
    name: 'fixture',
    version: '5.0.0',
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'fixture',
        version: '5.0.0',
        devDependencies: packageManifest.devDependencies,
      },
      'node_modules/@moldea.ai/cli': {
        version: '5.0.0',
        integrity: 'sha512-cli',
        dependencies: { '@moldea.ai/core': '2.0.1' },
      },
      'node_modules/@moldea.ai/core': {
        version: '2.0.1',
        integrity: 'sha512-core',
        dependencies: { semver: '7.8.5' },
      },
      'node_modules/semver': { version: '7.8.5', integrity: 'sha512-semver' },
      'node_modules/unrelated': { version: '9.0.0', integrity: 'sha512-unrelated' },
    },
  };
  writeFileSync(join(repositoryRoot, 'package.json'), `${JSON.stringify(packageManifest)}\n`);
  writeFileSync(join(repositoryRoot, 'package-lock.json'), `${JSON.stringify(packageLock)}\n`);
  return { packageLock, packageManifest, repositoryRoot };
};

const writeRepository = (
  repositoryRoot: string,
  packageManifest: IFixturePackageManifest,
  packageLock: IFixturePackageLock,
): void => {
  writeFileSync(join(repositoryRoot, 'package.json'), `${JSON.stringify(packageManifest)}\n`);
  writeFileSync(join(repositoryRoot, 'package-lock.json'), `${JSON.stringify(packageLock)}\n`);
};

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

test('isolates the complete CLI closure from release metadata and unrelated packages', () => {
  const { packageLock, packageManifest, repositoryRoot } = createRepository();
  const originalDigest = createCliClosureDigest(repositoryRoot);
  packageManifest.version = '5.0.1';
  packageManifest.devDependencies['unrelated'] = '10.0.0';
  packageLock.version = '5.0.1';
  const rootPackage = packageLock.packages[''];
  assert.ok(rootPackage !== undefined);
  rootPackage.version = '5.0.1';
  packageLock.packages['node_modules/unrelated'] = {
    version: '10.0.0',
    integrity: 'sha512-unrelated-next',
  };
  writeRepository(repositoryRoot, packageManifest, packageLock);

  assert.equal(createCliClosureDigest(repositoryRoot), originalDigest);
  assert.deepEqual(
    createCliClosureIdentity(repositoryRoot).packages.map(({ packageKey }) => packageKey),
    ['node_modules/@moldea.ai/cli', 'node_modules/@moldea.ai/core', 'node_modules/semver'],
  );
});

test('changes for versions, integrity values, and dependency edges invalidate the digest', () => {
  const { packageLock, packageManifest, repositoryRoot } = createRepository();
  const originalDigest = createCliClosureDigest(repositoryRoot);

  const corePackage = packageLock.packages['node_modules/@moldea.ai/core'];
  const cliPackage = packageLock.packages['node_modules/@moldea.ai/cli'];
  assert.ok(corePackage !== undefined);
  assert.ok(cliPackage?.dependencies !== undefined);
  corePackage.integrity = 'sha512-core-next';
  writeRepository(repositoryRoot, packageManifest, packageLock);
  assert.notEqual(createCliClosureDigest(repositoryRoot), originalDigest);

  corePackage.integrity = 'sha512-core';
  cliPackage.dependencies['@moldea.ai/core'] = '2.0.0';
  writeRepository(repositoryRoot, packageManifest, packageLock);
  assert.notEqual(createCliClosureDigest(repositoryRoot), originalDigest);

  cliPackage.dependencies['@moldea.ai/core'] = '2.0.1';
  packageManifest.devDependencies['@moldea.ai/cli'] = '5.0.1';
  cliPackage.version = '5.0.1';
  writeRepository(repositoryRoot, packageManifest, packageLock);
  assert.notEqual(createCliClosureDigest(repositoryRoot), originalDigest);
});

test('accepts exact prerelease versions inside the transitive CLI closure', () => {
  const { packageLock, packageManifest, repositoryRoot } = createRepository();
  const corePackage = packageLock.packages['node_modules/@moldea.ai/core'];
  assert.ok(corePackage !== undefined);
  corePackage.version = '2.0.1-beta.1';
  writeRepository(repositoryRoot, packageManifest, packageLock);

  assert.equal(
    createCliClosureIdentity(repositoryRoot).packages.find(
      ({ packageKey }) => packageKey === 'node_modules/@moldea.ai/core',
    )?.version,
    '2.0.1-beta.1',
  );
});

test('rejects malformed or incomplete CLI closures', () => {
  const { packageLock, packageManifest, repositoryRoot } = createRepository();
  delete packageLock.packages['node_modules/@moldea.ai/core'];
  writeRepository(repositoryRoot, packageManifest, packageLock);
  assert.throws(
    () => createCliClosureDigest(repositoryRoot),
    /cannot resolve required dependency/u,
  );

  const secondRepository = createRepository();
  const secondCorePackage = secondRepository.packageLock.packages['node_modules/@moldea.ai/core'];
  assert.ok(secondCorePackage !== undefined);
  delete secondCorePackage.integrity;
  writeRepository(
    secondRepository.repositoryRoot,
    secondRepository.packageManifest,
    secondRepository.packageLock,
  );
  assert.throws(
    () => createCliClosureDigest(secondRepository.repositoryRoot),
    /missing registry integrity/u,
  );
});
