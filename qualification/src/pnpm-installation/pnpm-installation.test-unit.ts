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

    expect(installation).toMatchObject({
      cacheDirectory: path.join(attemptDirectory, 'pnpm-cache'),
      configPath: path.join(attemptDirectory, 'pnpm-cache', 'pnpm-userconfig'),
      environment: {
        CI: 'true',
        PNPM_CONFIG_NPMRC_AUTH_FILE: path.join(attemptDirectory, 'pnpm-cache', 'pnpm-userconfig'),
        XDG_CACHE_HOME: path.join(attemptDirectory, 'pnpm-cache'),
        XDG_CONFIG_HOME: path.join(attemptDirectory, 'pnpm-cache'),
      },
      registryUrl: 'https://registry.npmjs.org/',
      storeDirectory: path.join(attemptDirectory, 'pnpm-store'),
    });
    expect(createQualificationPnpmOptions(installation)).toStrictEqual([
      '--registry',
      'https://registry.npmjs.org/',
      '--store-dir',
      path.join(attemptDirectory, 'pnpm-store'),
    ]);
  });

  test('does not inherit registry credentials or package-manager configuration', () => {
    const previousAuthToken = process.env['NPM_CONFIG_//REGISTRY.NPMJS.ORG/:_AUTHTOKEN'];
    const previousPnpmRegistry = process.env['PNPM_CONFIG_REGISTRY'];
    const previousNodeToken = process.env['NODE_AUTH_TOKEN'];

    try {
      process.env['NPM_CONFIG_//REGISTRY.NPMJS.ORG/:_AUTHTOKEN'] = 'fixture-secret';
      process.env['PNPM_CONFIG_REGISTRY'] = 'https://example.invalid/';
      process.env['NODE_AUTH_TOKEN'] = 'fixture-secret';
      const installation = createQualificationPnpmInstallation(
        path.resolve('qualification-attempt'),
      );

      expect(
        installation.environment['NPM_CONFIG_//REGISTRY.NPMJS.ORG/:_AUTHTOKEN'],
      ).toBeUndefined();
      expect(installation.environment['PNPM_CONFIG_REGISTRY']).toBeUndefined();
      expect(installation.environment['NODE_AUTH_TOKEN']).toBeUndefined();
      expect(installation.environment['PNPM_CONFIG_NPMRC_AUTH_FILE']).toBe(installation.configPath);
    } finally {
      for (const [name, previousValue] of [
        ['NPM_CONFIG_//REGISTRY.NPMJS.ORG/:_AUTHTOKEN', previousAuthToken],
        ['PNPM_CONFIG_REGISTRY', previousPnpmRegistry],
        ['NODE_AUTH_TOKEN', previousNodeToken],
      ] as const) {
        if (previousValue === undefined) delete process.env[name];
        else process.env[name] = previousValue;
      }
    }
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
