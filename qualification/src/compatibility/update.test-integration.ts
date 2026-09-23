// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

import { RUNTIME_COMPATIBILITY_SOURCE_URL } from './types.ts';
import { getRuntimeCompatibilityMatrix, readRuntimeCompatibilitySnapshot } from './snapshot.ts';
import { updateRuntimeCompatibilitySnapshot } from './update.ts';

const createFetch =
  (source: string, status = 200): typeof fetch =>
  () => {
    const response = new Response(source, { status });
    Object.defineProperty(response, 'url', { value: RUNTIME_COMPATIBILITY_SOURCE_URL });
    return Promise.resolve(response);
  };

test('refreshes only after full profile validation and leaves an identical snapshot untouched', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'moldea-compatibility-update-'));
  try {
    const snapshotPath = path.join(root, 'snapshot.json');
    const snapshot = await readRuntimeCompatibilitySnapshot();
    const source = JSON.stringify(snapshot.publication);
    const first = await updateRuntimeCompatibilitySnapshot({
      fetcher: createFetch(source),
      snapshotPath,
    });
    const firstContent = await readFile(snapshotPath, 'utf8');
    const second = await updateRuntimeCompatibilitySnapshot({
      fetcher: createFetch(source),
      snapshotPath,
    });
    expect(first).toStrictEqual({ changed: true, profileCount: 14, sha256: snapshot.sha256 });
    expect(second).toStrictEqual({ ...first, changed: false });
    expect(await readFile(snapshotPath, 'utf8')).toBe(firstContent);

    for (const [badSource, status] of [
      ['{', 200],
      [JSON.stringify({ ...snapshot.publication, schemaVersion: 2 }), 200],
      [source, 500],
      ['x'.repeat(1024 * 1024 + 1), 200],
    ] as const) {
      await expect(
        updateRuntimeCompatibilitySnapshot({
          fetcher: createFetch(badSource, status),
          snapshotPath,
        }),
      ).rejects.toThrow();
      expect(await readFile(snapshotPath, 'utf8')).toBe(firstContent);
    }

    const customAdapter = snapshot.publication.adapters['custom'];
    const anthropicAdapter = snapshot.publication.adapters['anthropic'];
    const customTarget = customAdapter?.targets?.[0];
    const anthropicTarget = anthropicAdapter?.targets?.[0];
    const anthropicPackage = anthropicTarget?.packages?.[0];
    const customPatterns =
      getRuntimeCompatibilityMatrix(snapshot).adapters['custom']?.targets?.[0]?.patterns;
    if (
      customAdapter === undefined ||
      customTarget === undefined ||
      anthropicAdapter === undefined ||
      anthropicTarget === undefined ||
      anthropicPackage === undefined
    ) {
      throw new Error('Published fixture is missing a required target or package.');
    }
    const missingTarget = {
      ...snapshot.publication,
      adapters: { ...snapshot.publication.adapters, custom: { ...customAdapter, targets: [] } },
    };
    const incompatiblePin = {
      ...snapshot.publication,
      adapters: {
        ...snapshot.publication.adapters,
        anthropic: {
          ...anthropicAdapter,
          targets: [
            {
              ...anthropicTarget,
              packages: [
                { ...anthropicPackage, versionRange: '999.0.0' },
                ...(anthropicTarget.packages?.slice(1) ?? []),
              ],
            },
            ...(anthropicAdapter.targets?.slice(1) ?? []),
          ],
        },
      },
    };
    const missingClaim = {
      ...snapshot.publication,
      adapters: {
        ...snapshot.publication.adapters,
        custom: {
          ...customAdapter,
          targets: [
            {
              ...customTarget,
              patterns: [
                ...(customPatterns ?? []),
                {
                  description: 'Uncovered new behavior.',
                  id: 'uncovered-new-behavior',
                  kind: 'runtime',
                  support: 'full',
                },
              ],
            },
            ...(customAdapter.targets?.slice(1) ?? []),
          ],
        },
      },
    };
    for (const publication of [missingTarget, incompatiblePin, missingClaim]) {
      await expect(
        updateRuntimeCompatibilitySnapshot({
          fetcher: createFetch(JSON.stringify(publication)),
          snapshotPath,
        }),
      ).rejects.toThrow();
      expect(await readFile(snapshotPath, 'utf8')).toBe(firstContent);
    }

    await expect(
      updateRuntimeCompatibilitySnapshot({
        fetcher: () => Promise.reject(new Error('request timed out')),
        snapshotPath,
      }),
    ).rejects.toThrow('request timed out');
    expect(await readFile(snapshotPath, 'utf8')).toBe(firstContent);

    await expect(
      updateRuntimeCompatibilitySnapshot({
        fetcher: () => {
          const response = new Response(source);
          Object.defineProperty(response, 'url', { value: 'https://example.com/runtimes.json' });
          return Promise.resolve(response);
        },
        snapshotPath,
      }),
    ).rejects.toThrow('Published compatibility request failed');
    expect(await readFile(snapshotPath, 'utf8')).toBe(firstContent);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
