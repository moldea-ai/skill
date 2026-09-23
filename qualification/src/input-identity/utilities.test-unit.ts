// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  isQualificationBehaviorBearingSourcePath,
  normalizeQualificationRuntimePackageLock,
  normalizeQualificationRuntimePackageManifest,
  normalizeQualificationToolingPackageLock,
  normalizeQualificationToolingPackageManifest,
} from './utilities.ts';

describe('qualification input identity', () => {
  test.each([
    ['executor.ts', true],
    ['executor.test-unit.ts', false],
    ['index.d.mts', false],
    ['nested/contracts.d.ts', false],
  ])('isQualificationBehaviorBearingSourcePath(%s) -> %s', (relativePath, expectedResult) => {
    expect(isQualificationBehaviorBearingSourcePath(relativePath)).toBe(expectedResult);
  });

  test('isolates the installed closure of shared tooling packages', () => {
    const normalizedLock = normalizeQualificationToolingPackageLock(
      {
        lockfileVersion: 3,
        packages: {
          '': {
            devDependencies: { unrelated: '2.0.0', semver: '7.8.5' },
          },
          'node_modules/semver': {
            version: '7.8.5',
            resolved: 'https://registry.npmjs.org/semver.tgz',
            integrity: 'sha512-semver',
            dev: true,
            license: 'ISC',
            dependencies: { 'semver-runtime': '1.0.0' },
          },
          'node_modules/semver/node_modules/semver-runtime': {
            version: '1.0.0',
            integrity: 'sha512-runtime',
            dev: true,
          },
          'node_modules/unrelated': {
            version: '2.0.0',
            integrity: 'sha512-unrelated',
            dev: true,
          },
        },
      },
      ['semver'],
    );

    expect(normalizedLock).toStrictEqual({
      lockfileVersion: 3,
      packages: {
        '': { packages: { semver: '7.8.5' } },
        'node_modules/semver': {
          dependencies: { 'semver-runtime': '1.0.0' },
          integrity: 'sha512-semver',
          version: '7.8.5',
        },
        'node_modules/semver/node_modules/semver-runtime': {
          integrity: 'sha512-runtime',
          version: '1.0.0',
        },
      },
    });
  });

  test('isolates qualification runtime packages from sibling workspaces', () => {
    expect(
      normalizeQualificationRuntimePackageLock({
        name: 'repository',
        version: '1.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': {
            name: 'repository',
            version: '1.0.0',
            workspaces: ['qualification', 'website'],
          },
          qualification: {
            name: 'qualification',
            version: '2.0.0',
            dependencies: { runtime: '3.0.0' },
            devDependencies: { 'qualification-dev': '4.0.0' },
          },
          website: {
            name: 'website',
            version: '5.0.0',
            dependencies: { 'website-runtime': '6.0.0' },
          },
          'node_modules/runtime': {
            version: '3.0.0',
            dependencies: { transitive: '7.0.0' },
          },
          'node_modules/transitive': { version: '7.0.0' },
          'node_modules/qualification-dev': { version: '4.0.0', dev: true },
          'node_modules/website-runtime': { version: '6.0.0' },
        },
      }),
    ).toStrictEqual({
      lockfileVersion: 3,
      name: 'qualification',
      packages: {
        '': {
          dependencies: { runtime: '3.0.0' },
          name: 'qualification',
          version: '2.0.0',
        },
        'node_modules/runtime': {
          dependencies: { transitive: '7.0.0' },
          version: '3.0.0',
        },
        'node_modules/transitive': { version: '7.0.0' },
      },
      requires: true,
      version: '2.0.0',
    });
  });

  test('includes the pnpm pin and installed integrity in qualification runtime identity', () => {
    const manifest = { dependencies: { pnpm: '11.27.1' }, type: 'module' };
    const lock = {
      lockfileVersion: 3,
      packages: {
        '': { workspaces: ['qualification'] },
        qualification: { dependencies: { pnpm: '11.27.1' } },
        'node_modules/pnpm': { version: '11.27.1', integrity: 'sha512-current' },
      },
    };

    expect(normalizeQualificationRuntimePackageManifest(manifest)).not.toStrictEqual(
      normalizeQualificationRuntimePackageManifest({
        ...manifest,
        dependencies: { pnpm: '11.8.0' },
      }),
    );
    expect(normalizeQualificationRuntimePackageLock(lock)).not.toStrictEqual(
      normalizeQualificationRuntimePackageLock({
        ...lock,
        packages: {
          ...lock.packages,
          'node_modules/pnpm': { version: '11.27.1', integrity: 'sha512-changed' },
        },
      }),
    );
  });

  test('isolates shared tooling declarations from unrelated root packages', () => {
    expect(
      normalizeQualificationToolingPackageManifest(
        {
          devDependencies: {
            '@moldea.ai/cli': '5.0.0',
            semver: '7.8.5',
          },
        },
        ['semver'],
      ),
    ).toStrictEqual({ packages: { semver: '7.8.5' } });
  });
});
