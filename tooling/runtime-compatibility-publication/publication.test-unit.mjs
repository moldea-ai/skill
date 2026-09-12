// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  parseRuntimeCompatibilityPublication,
  validateRuntimeCompatibilityPublication,
} from './index.mjs';

const FIXTURE_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'fixtures',
  'tooling',
  'runtime-compatibility-publication.json',
);

test('validates the narrow development publication fixture', () => {
  const publication = parseRuntimeCompatibilityPublication(readFileSync(FIXTURE_PATH, 'utf8'));

  assert.equal('maturity' in publication.adapters.custom.targets[0], false);
  assert.equal('maturity' in publication.adapters.openai.targets[0], false);
  assert.equal(publication.adapters.openai.targets[0].packages[0].versionRange, '>=7.4.0');
});

test('ignores additive website metadata while retaining technical validation', () => {
  const publication = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  publication.adapters.openai.targets[0].maturity = 'website-defined';
  publication.adapters.openai.targets[0].display = { badge: 'preview' };

  assert.equal(validateRuntimeCompatibilityPublication(publication), publication);
});

test('rejects malformed roots, malformed technical targets, and duplicate identities', () => {
  assert.throws(() => parseRuntimeCompatibilityPublication('{'), /not valid JSON/u);
  assert.throws(
    () => validateRuntimeCompatibilityPublication({ schemaVersion: 2 }),
    /unsupported root contract/u,
  );

  for (const [field, invalidValue] of [
    ['kind', 'provider'],
    ['lastVerifiedAt', 'September 1, 2026'],
  ]) {
    const publication = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
    publication.adapters.openai.targets[0][field] = invalidValue;
    assert.throws(
      () => validateRuntimeCompatibilityPublication(publication),
      /invalid openai adapter/u,
    );
  }

  const duplicatePublication = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  duplicatePublication.adapters.openai.targets.push({
    ...duplicatePublication.adapters.openai.targets[0],
  });
  assert.throws(
    () => validateRuntimeCompatibilityPublication(duplicatePublication),
    /invalid openai adapter/u,
  );
});
