// @vitest-environment node
import path from 'node:path';
import { expect, test } from 'vitest';

import { loadSemanticCases } from '../cases/index.ts';

import { createSemanticCatalogWebsiteModel } from './index.ts';

test('the public projection includes every eligible case and omits the private cases', async () => {
  const definitions = await loadSemanticCases(path.resolve(import.meta.dirname, '../cases'));
  const eligible = definitions.filter(({ publication }) => publication !== 'private');
  const model = createSemanticCatalogWebsiteModel(definitions);
  const publicIds = model.groups.flatMap(({ cases }) => cases.map(({ id }) => id)).sort();
  expect(model.caseCount).toBe(eligible.length);
  expect(publicIds).toStrictEqual(eligible.map(({ id }) => id).sort());
  expect(publicIds).not.toContain('exact-binding-relevance');
  for (const id of ['read-only-git-helper-suppression', 'repair-stale-integration']) {
    expect(publicIds).toContain(id);
  }
});
