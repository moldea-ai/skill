import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL,
  enforceMoldeaProductNameCasing,
  hasValidMoldeaProductNameCasing,
} from './product-name.mjs';

test('accepts lowercase product prose and exact technical identifiers', () => {
  for (const text of [
    'moldea keeps project context repository-bound.',
    'Install @moldea.ai/cli and call MoldeaClient.',
    'The moldea-agent identifier is technical syntax.',
  ]) {
    assert.equal(hasValidMoldeaProductNameCasing(text), true);
  }
});

test('rejects standalone incorrectly capitalized product prose', () => {
  for (const text of [
    'Moldea keeps project context repository-bound.',
    'MOLDEA keeps project context repository-bound.',
    'mOlDeA keeps project context repository-bound.',
    'Use Moldea, then continue.',
    'The product is (Moldea).',
  ]) {
    assert.equal(hasValidMoldeaProductNameCasing(text), false);
  }
});

test('adds a deterministic forbidden result without rewriting model evidence', () => {
  const actorResponse = 'Moldea is repository-bound.';
  const assessment = {
    forbidden: [],
    isPassed: true,
    observed: ['expected'],
    rationale: 'The actor described moldea correctly.',
  };

  assert.deepEqual(enforceMoldeaProductNameCasing(assessment, actorResponse), {
    ...assessment,
    forbidden: [INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL],
    isPassed: false,
  });
  assert.equal(actorResponse, 'Moldea is repository-bound.');
});

test('rejects incorrect judge rationale casing independently', () => {
  const result = enforceMoldeaProductNameCasing(
    {
      forbidden: [],
      isPassed: true,
      observed: ['expected'],
      rationale: 'Moldea behavior was correct.',
    },
    'moldea behavior was correct.',
  );

  assert.deepEqual(result.forbidden, [INCORRECT_MOLDEA_PRODUCT_NAME_CASING_LABEL]);
  assert.equal(result.isPassed, false);
});
