// @vitest-environment node
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { createEvidenceBundle, decodeEvidenceBundle } from './bundle.ts';
import { packCompletedEvidenceRun, storeCompletedEvidenceRun } from './storage.ts';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('completed evidence storage', () => {
  test('packs the explicitly selected completed semantic run', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-storage-'));
    temporaryRoots.push(root);
    for (const attemptId of ['semantic-first', 'semantic-second']) {
      await storeCompletedEvidenceRun(
        root,
        createEvidenceBundle({
          classification: 'official',
          kind: 'semantic',
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

    const result = await packCompletedEvidenceRun(
      root,
      'semantic',
      'semantic-first',
      path.join(root, 'bundles', 'semantic-first.json.gz'),
    );

    expect(decodeEvidenceBundle(await readFile(result.outputPath)).run.attemptId).toBe(
      'semantic-first',
    );
  });
});

test('stores and packs the journeys evidence kind', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-journeys-storage-'));
  temporaryRoots.push(root);
  await storeCompletedEvidenceRun(
    root,
    createEvidenceBundle({
      classification: 'official',
      kind: 'journeys',
      payload: { platforms: ['chatgpt', 'claude'] },
      run: {
        attemptId: '20261012-abcdef',
        evaluatedAt: '2026-10-12T00:00:00.000Z',
        provenance: {},
        status: 'passed',
        version: '8.0.1',
      },
    }),
  );
  const packed = await packCompletedEvidenceRun(
    root,
    'journeys',
    '20261012-abcdef',
    path.join(root, 'bundle.json.gz'),
  );
  expect(decodeEvidenceBundle(await readFile(packed.outputPath)).kind).toBe('journeys');
});
