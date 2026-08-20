// @vitest-environment node
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { DEFAULT_PACKAGES_REPOSITORY } from '../constants/index.ts';
import { ensureDirectory } from '../filesystem/index.ts';
import { getQualificationModelCallCount } from './utilities.ts';

describe('qualification CLI utilities', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('resolves paid call counts from the explicitly selected packages checkout', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-cli-'));
    const compatibilityDirectory = path.join(temporaryRoot, 'compatibility');
    const matrixPath = path.join(compatibilityDirectory, 'runtimes.yaml');
    await ensureDirectory(compatibilityDirectory);
    await copyFile(
      path.join(DEFAULT_PACKAGES_REPOSITORY, 'compatibility', 'runtimes.yaml'),
      matrixPath,
    );

    await expect(
      getQualificationModelCallCount(
        { adapterId: 'custom', implementationId: 'custom' },
        temporaryRoot,
      ),
    ).resolves.toBe(6);

    await rm(matrixPath);
    await expect(
      getQualificationModelCallCount(
        { adapterId: 'custom', implementationId: 'custom' },
        temporaryRoot,
      ),
    ).rejects.toThrow();
  });
});
