// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { ensureDirectory } from '../filesystem/index.ts';
import { calculateQualificationDigest } from './fingerprints.ts';

describe('qualification input fingerprint', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('excludes installed dependencies and public results while retaining source inputs', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-fingerprint-'));
    const sourcePath = path.join(temporaryRoot, 'src', 'runner.ts');
    const dependencyPath = path.join(temporaryRoot, 'node_modules', 'dependency', 'index.js');
    const resultPath = path.join(temporaryRoot, 'results', 'custom', 'latest.json');
    await Promise.all([
      ensureDirectory(path.dirname(sourcePath)),
      ensureDirectory(path.dirname(dependencyPath)),
      ensureDirectory(path.dirname(resultPath)),
    ]);
    await Promise.all([
      writeFile(sourcePath, 'export const version = 1;\n', 'utf8'),
      writeFile(dependencyPath, 'export const dependency = 1;\n', 'utf8'),
      writeFile(resultPath, '{"status":"passed"}\n', 'utf8'),
    ]);
    const initialDigest = await calculateQualificationDigest(temporaryRoot);

    await Promise.all([
      writeFile(dependencyPath, 'export const dependency = 2;\n', 'utf8'),
      writeFile(resultPath, '{"status":"failed"}\n', 'utf8'),
    ]);

    expect(await calculateQualificationDigest(temporaryRoot)).toBe(initialDigest);

    await writeFile(sourcePath, 'export const version = 2;\n', 'utf8');
    expect(await calculateQualificationDigest(temporaryRoot)).not.toBe(initialDigest);
  });
});
