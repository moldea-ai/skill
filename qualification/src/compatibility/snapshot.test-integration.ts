// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import {
  captureAttemptCompatibilitySnapshot,
  readAttemptCompatibilitySnapshot,
  readRuntimeCompatibilitySnapshot,
} from './snapshot.ts';

test('captures an attempt input once and rejects missing or tampered recovery', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'moldea-compatibility-capture-'));
  try {
    const snapshot = await readRuntimeCompatibilitySnapshot();
    const attemptDirectory = path.join(root, 'attempt');
    await captureAttemptCompatibilitySnapshot(attemptDirectory, snapshot);
    expect(await readAttemptCompatibilitySnapshot(attemptDirectory, snapshot)).toStrictEqual(
      snapshot,
    );
    await expect(captureAttemptCompatibilitySnapshot(attemptDirectory, snapshot)).rejects.toThrow();
    const capturePath = path.join(attemptDirectory, 'compatibility-snapshot.json');
    await writeFile(
      capturePath,
      (await readFile(capturePath, 'utf8')).replace('available', 'planned'),
    );
    await expect(readAttemptCompatibilitySnapshot(attemptDirectory, snapshot)).rejects.toThrow();
    await rm(capturePath);
    await expect(readAttemptCompatibilitySnapshot(attemptDirectory, snapshot)).rejects.toThrow();
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
