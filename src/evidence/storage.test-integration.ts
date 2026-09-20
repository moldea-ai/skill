// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createEvidenceBundle, decodeEvidenceBundle } from './bundle.ts';
import { packLatestCompletedEvidenceRun, storeCompletedEvidenceRun } from './storage.ts';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('completed evidence storage', () => {
  test('packs the latest completed qualification run without a run selector', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-storage-'));
    temporaryRoots.push(root);
    for (const attemptId of ['qualification-first', 'qualification-second']) {
      await storeCompletedEvidenceRun(
        root,
        createEvidenceBundle({
          classification: 'official',
          kind: 'qualification',
          payload: { attemptId },
          run: {
            attemptId,
            evaluatedAt: '2026-09-19T12:00:00.000Z',
            provenance: {},
            status: 'passed',
            version: '8.0.0',
          },
        }),
      );
    }

    const result = await packLatestCompletedEvidenceRun(
      root,
      'qualification',
      path.join(root, 'bundles'),
    );

    expect(result.attemptId).toBe('qualification-second');
    expect(decodeEvidenceBundle(await readFile(result.outputPath)).run.attemptId).toBe(
      'qualification-second',
    );
  });
});
