// @vitest-environment node
import path from 'node:path';
import { describe, expect, test } from 'vitest';

import {
  createQualificationPnpmInstallation,
  createQualificationPnpmOptions,
  createQualificationPnpmPackageVersions,
} from './pnpm-installation.ts';

describe('createQualificationPnpmInstallation', () => {
  test('owns package content and metadata inside the attempt', () => {
    const attemptDirectory = path.resolve('qualification-attempt');
    const installation = createQualificationPnpmInstallation(attemptDirectory);

    expect(installation).toStrictEqual({
      cacheDirectory: path.join(attemptDirectory, 'pnpm-cache'),
      configPath: path.join(attemptDirectory, 'pnpm-cache', 'pnpm-userconfig'),
      environment: {
        ...process.env,
        CI: 'true',
        XDG_CACHE_HOME: path.join(attemptDirectory, 'pnpm-cache'),
      },
      registryUrl: 'https://registry.npmjs.org/',
      storeDirectory: path.join(attemptDirectory, 'pnpm-store'),
    });
    expect(createQualificationPnpmOptions(installation)).toStrictEqual([
      '--userconfig',
      path.join(attemptDirectory, 'pnpm-cache', 'pnpm-userconfig'),
      '--registry',
      'https://registry.npmjs.org/',
      '--store-dir',
      path.join(attemptDirectory, 'pnpm-store'),
    ]);
  });

  test('creates exact version contracts and rejects duplicate package identities', () => {
    expect(
      createQualificationPnpmPackageVersions([
        { name: '@moldea.ai/cli', version: '8.0.0' },
        { name: 'typescript', version: '6.0.3' },
      ]),
    ).toStrictEqual({ '@moldea.ai/cli': '8.0.0', typescript: '6.0.3' });
    expect(() =>
      createQualificationPnpmPackageVersions([
        { name: 'typescript', version: '6.0.3' },
        { name: 'typescript', version: '6.0.4' },
      ]),
    ).toThrow('Duplicate qualification package identity: typescript.');
  });
});
