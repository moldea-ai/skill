// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { executeQualificationPnpm } from './tool.ts';
import {
  createQualificationPnpmInstallation,
  initializeQualificationPnpmInstallation,
} from './pnpm-installation.ts';

describe('qualification pnpm installation', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) await rm(temporaryRoot, { force: true, recursive: true });
  });

  test('routes pnpm metadata beneath the attempt cache', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-pnpm-installation-'));
    const installation = createQualificationPnpmInstallation(temporaryRoot);
    await initializeQualificationPnpmInstallation(installation);
    const result = await executeQualificationPnpm({
      args: ['store', 'path', '--store-dir', installation.storeDirectory],
      cwd: process.cwd(),
      environment: installation.environment,
    });

    expect(path.normalize(result.stdout.trim())).toBe(
      path.join(installation.storeDirectory, 'v11'),
    );
    expect(installation.environment['PNPM_CONFIG_NPMRC_AUTH_FILE']).toBe(installation.configPath);
    expect(installation.environment['XDG_CACHE_HOME']).toBe(installation.cacheDirectory);
    expect(installation.environment['XDG_CONFIG_HOME']).toBe(installation.cacheDirectory);
    await expect(readFile(installation.configPath, 'utf8')).resolves.toBe('');
  });

  test('installs an offline fixture through the pinned launcher with a poisoned PATH', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-pnpm-offline-'));
    const projectRoot = path.join(temporaryRoot, 'project');
    const fixtureRoot = path.join(projectRoot, 'fixture');
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(
      path.join(projectRoot, 'package.json'),
      JSON.stringify({
        name: 'fixture-project',
        version: '1.0.0',
        dependencies: { fixture: 'file:./fixture' },
      }),
    );
    await writeFile(
      path.join(fixtureRoot, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0' }),
    );
    const installation = createQualificationPnpmInstallation(temporaryRoot);
    await initializeQualificationPnpmInstallation(installation);

    await executeQualificationPnpm({
      args: [
        'install',
        '--offline',
        '--ignore-scripts',
        '--lockfile=false',
        '--store-dir',
        installation.storeDirectory,
      ],
      cwd: projectRoot,
      environment: { ...installation.environment, PATH: temporaryRoot },
    });

    const installedManifest = await readFile(
      path.join(projectRoot, 'node_modules', 'fixture', 'package.json'),
      'utf8',
    );
    expect(JSON.parse(installedManifest)).toStrictEqual({ name: 'fixture', version: '1.0.0' });
  });
});
