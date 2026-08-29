// @vitest-environment node
import { describe, expect, test } from 'vitest';

import {
  isQualificationBehaviorBearingSourcePath,
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
