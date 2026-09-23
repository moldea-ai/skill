// @vitest-environment node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';

import {
  parseRuntimeCompatibilityPublication,
  validateRuntimeCompatibilityPublication,
} from './index.ts';

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
  const customTarget = publication.adapters['custom']?.targets?.[0];
  const openAiTarget = publication.adapters['openai']?.targets?.[0];
  assert.ok(customTarget !== undefined);
  assert.ok(openAiTarget !== undefined);
  assert.ok(openAiTarget.packages?.[0] !== undefined);

  assert.equal('maturity' in customTarget, false);
  assert.equal('maturity' in openAiTarget, false);
  assert.equal(openAiTarget.packages[0].versionRange, '>=7.4.0');
});

test('ignores additive website metadata while retaining technical validation', () => {
  const publication = structuredClone(
    parseRuntimeCompatibilityPublication(readFileSync(FIXTURE_PATH, 'utf8')),
  );
  const target = publication.adapters['openai']?.targets?.[0];
  assert.ok(target !== undefined);
  target['maturity'] = 'website-defined';
  target['display'] = { badge: 'preview' };

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
  ] as const) {
    const publication = structuredClone(
      parseRuntimeCompatibilityPublication(readFileSync(FIXTURE_PATH, 'utf8')),
    );
    const target = publication.adapters['openai']?.targets?.[0];
    assert.ok(target !== undefined);
    const mutableTarget: Record<string, unknown> = target;
    mutableTarget[field] = invalidValue;
    assert.throws(
      () => validateRuntimeCompatibilityPublication(publication),
      /invalid openai adapter/u,
    );
  }

  const duplicatePublication = structuredClone(
    parseRuntimeCompatibilityPublication(readFileSync(FIXTURE_PATH, 'utf8')),
  );
  const targets = duplicatePublication.adapters['openai']?.targets;
  assert.ok(targets?.[0] !== undefined);
  targets.push({ ...targets[0] });
  assert.throws(
    () => validateRuntimeCompatibilityPublication(duplicatePublication),
    /invalid openai adapter/u,
  );
});
