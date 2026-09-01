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

  assert.equal(publication.adapters.custom.targets[0].maturity, 'supported');
  assert.equal(publication.adapters.openai.targets[0].maturity, 'experimental');
});

test('rejects malformed roots, unsupported target maturity, and duplicate target identities', () => {
  assert.throws(
    () => parseRuntimeCompatibilityPublication('{'),
    /not valid JSON/u,
  );
  assert.throws(
    () => validateRuntimeCompatibilityPublication({ schemaVersion: 2 }),
    /unsupported root contract/u,
  );

  for (const maturity of ['deprecated', 'stable']) {
    const publication = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
    publication.adapters.openai.targets[0].maturity = maturity;
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
