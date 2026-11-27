// @vitest-environment node
import path from 'node:path';
import { expect, test } from 'vitest';

import { loadSemanticCases } from '../cases/index.ts';

import { createSemanticCatalogWebsiteModel } from './index.ts';

test('the public projection includes every eligible case and omits the private cases', async () => {
  const definitions = await loadSemanticCases(path.resolve(import.meta.dirname, '../cases'));
  const eligible = definitions.filter(({ publication }) => publication !== 'private');
  const model = createSemanticCatalogWebsiteModel(definitions);
  expect(model.caseCount).toBe(eligible.length);
  expect(
    model.groups
      .flatMap((group) => group.cases)
      .map(({ id }) => id)
      .sort(),
  ).toStrictEqual(eligible.map(({ id }) => id).sort());
  for (const id of [
    'exact-binding-relevance',
    'read-only-git-helper-suppression',
    'repair-stale-integration',
  ]) {
    expect(model.groups.flatMap((group) => group.cases).some((entry) => entry.id === id)).toBe(
      true,
    );
  }
});
