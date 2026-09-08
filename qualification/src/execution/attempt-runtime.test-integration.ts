// @vitest-environment node
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { ensureDirectory } from '../filesystem/index.ts';
import { cleanupQualificationAttemptRuntime } from './attempt-runtime.ts';

const hasPath = async (candidatePath: string): Promise<boolean> => {
  try {
    await access(candidatePath);
    return true;
  } catch {
    return false;
  }
};

describe('cleanupQualificationAttemptRuntime', () => {
  let temporaryRoot: string | null = null;

  afterEach(async () => {
    if (temporaryRoot !== null) {
      await rm(temporaryRoot, { force: true, recursive: true });
    }
  });

  test('retains public and resume-only internal state for an interrupted attempt', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-runtime-'));
    for (const relativeDirectory of ['internal', 'pnpm-store', 'public', 'runtime', 'workspaces']) {
      const directoryPath = path.join(temporaryRoot, relativeDirectory);
      await ensureDirectory(directoryPath);
      await writeFile(path.join(directoryPath, 'artifact'), relativeDirectory, 'utf8');
    }

    await cleanupQualificationAttemptRuntime(temporaryRoot, true);

    expect(await hasPath(path.join(temporaryRoot, 'internal', 'artifact'))).toBe(true);
    expect(await hasPath(path.join(temporaryRoot, 'public', 'artifact'))).toBe(true);
    for (const relativeDirectory of ['pnpm-store', 'runtime', 'workspaces']) {
      expect(await hasPath(path.join(temporaryRoot, relativeDirectory))).toBe(false);
    }
  });

  test('removes every disposable tree after resume is no longer allowed', async () => {
    temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'moldea-qualification-runtime-'));
    for (const relativeDirectory of ['internal', 'pnpm-store', 'public', 'runtime', 'workspaces']) {
      const directoryPath = path.join(temporaryRoot, relativeDirectory);
      await ensureDirectory(directoryPath);
      await writeFile(path.join(directoryPath, 'artifact'), relativeDirectory, 'utf8');
    }

    await cleanupQualificationAttemptRuntime(temporaryRoot, false);
    await cleanupQualificationAttemptRuntime(temporaryRoot, false);

    expect(await hasPath(path.join(temporaryRoot, 'public', 'artifact'))).toBe(true);
    for (const relativeDirectory of ['internal', 'pnpm-store', 'runtime', 'workspaces']) {
      expect(await hasPath(path.join(temporaryRoot, relativeDirectory))).toBe(false);
    }
  });
});
