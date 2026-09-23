// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { executeQualificationPnpm, getQualificationPnpmVersion } from './tool.ts';

describe('qualification pnpm executable', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) await rm(temporaryRoot, { recursive: true, force: true });
  });

  test('reports the installed version even when PATH cannot provide pnpm', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'qualification-pnpm-version-'));
    const result = await executeQualificationPnpm({
      args: ['--version'],
      cwd: temporaryRoot,
      environment: { ...process.env, PATH: temporaryRoot },
    });

    expect(result.stdout.trim()).toBe('11.27.1');
    await expect(getQualificationPnpmVersion()).resolves.toBe('11.27.1');
  });

  test('rejects a conflicting project package-manager version before installation', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'qualification-pnpm-conflict-'));
    await writeFile(
      path.join(temporaryRoot, 'package.json'),
      JSON.stringify({ name: 'fixture', version: '1.0.0', packageManager: 'pnpm@12.0.0' }),
    );

    await expect(
      executeQualificationPnpm({
        args: ['install', '--offline', '--ignore-scripts', '--lockfile=false'],
        cwd: temporaryRoot,
      }),
    ).rejects.toThrow(/configured to use 12\.0\.0 of pnpm/u);
  });
});
