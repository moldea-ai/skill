// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';

import { writeJsonFileAtomically } from '../filesystem/index.ts';
import { readEvidenceSelection, updateEvidenceSelection } from './selection.ts';
import type { IEvidenceSelection, IEvidenceSelectionReference } from './types.ts';

const temporaryRoots: string[] = [];

const createReference = (kind: 'qualification' | 'semantic'): IEvidenceSelectionReference => ({
  assetName: `${kind}-attempt-1.json.gz`,
  classification: 'official',
  repository: 'moldea-ai/skill',
  sha256: (kind === 'semantic' ? 'a' : 'b').repeat(64),
  tag: `evidence-${kind}-attempt-1`,
});

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

test('serializes independent concurrent selection updates without losing either section', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'moldea-evidence-selection-'));
  temporaryRoots.push(root);
  const selectionPath = path.join(root, 'selection.json');
  await writeJsonFileAtomically(selectionPath, {
    formatVersion: 1,
    qualification: null,
    semantic: null,
  } satisfies IEvidenceSelection);

  await Promise.all([
    updateEvidenceSelection(selectionPath, 'semantic', createReference('semantic')),
    updateEvidenceSelection(selectionPath, 'qualification', createReference('qualification')),
  ]);

  expect(await readEvidenceSelection(selectionPath)).toStrictEqual({
    formatVersion: 1,
    qualification: createReference('qualification'),
    semantic: createReference('semantic'),
  });
});
