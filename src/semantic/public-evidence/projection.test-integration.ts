// @vitest-environment node
import path from 'node:path';
import { expect, test } from 'vitest';

import { loadSemanticCases } from '../cases/index.ts';

import { createSemanticCatalogWebsiteModel } from './index.ts';

test('the public projection contains every one of the 143 discovered cases', async () => {
  const definitions = await loadSemanticCases(path.resolve(import.meta.dirname, '../cases'));
  expect(definitions).toHaveLength(143);
  expect(definitions.filter(({ publication }) => publication === 'private')).toStrictEqual([]);
  const model = createSemanticCatalogWebsiteModel(definitions);
  expect(model.caseCount).toBe(143);
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
