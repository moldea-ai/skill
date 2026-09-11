// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { executeProcess } from '../process/index.ts';
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
    const result = await executeProcess({
      command: 'pnpm',
      args: ['cache', 'path', '--userconfig', installation.configPath],
      cwd: process.cwd(),
      environment: installation.environment,
    });

    expect(path.normalize(result.stdout.trim())).toBe(
      path.join(installation.cacheDirectory, 'pnpm'),
    );
    await expect(readFile(installation.configPath, 'utf8')).resolves.toBe('');
  });
});
