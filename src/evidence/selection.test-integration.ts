// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { writeJsonFile } from 'jg-fs';

import { readEvidenceSelection, updateEvidenceSelection } from './selection.ts';
import type { IEvidenceSelection, IEvidenceSelectionReference } from './types.ts';

const temporaryRoots: string[] = [];

const createReference = (suffix: 'a' | 'b'): IEvidenceSelectionReference => ({
  assetName: `semantic-attempt-${suffix}.json.gz`,
  classification: 'official',
  repository: 'moldea-ai/skill',
  sha256: suffix.repeat(64),
  tag: `evidence-semantic-attempt-${suffix}`,
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

test('serializes concurrent selection updates and retains the last completed reference', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-selection-'));
  temporaryRoots.push(root);
  const selectionPath = path.join(root, 'selection.json');
  await writeJsonFile(selectionPath, {
    formatVersion: 1,
    journeys: null,
    semantic: null,
  } satisfies IEvidenceSelection);

  const completed: IEvidenceSelectionReference[] = [];
  await Promise.all(
    (['a', 'b'] as const).map(async (suffix) => {
      const result = await updateEvidenceSelection(
        selectionPath,
        'semantic',
        createReference(suffix),
      );
      if (result.semantic !== null) completed.push(result.semantic);
    }),
  );
  expect(completed).toHaveLength(2);

  expect(await readEvidenceSelection(selectionPath)).toStrictEqual({
    formatVersion: 1,
    journeys: null,
    semantic: completed.at(-1),
  });
});

test('retains both independently selected evidence kinds during concurrent updates', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-selection-'));
  temporaryRoots.push(root);
  const selectionPath = path.join(root, 'selection.json');
  await writeJsonFile(selectionPath, {
    formatVersion: 1,
    semantic: null,
    journeys: null,
  });
  const semantic = createReference('a');
  const journeys = {
    ...createReference('b'),
    assetName: 'journeys-run-b.json.gz',
    tag: 'evidence-journeys-run-b',
  };
  await Promise.all([
    updateEvidenceSelection(selectionPath, 'semantic', semantic),
    updateEvidenceSelection(selectionPath, 'journeys', journeys),
  ]);
  expect(await readEvidenceSelection(selectionPath)).toStrictEqual({
    formatVersion: 1,
    semantic,
    journeys,
  });
});
