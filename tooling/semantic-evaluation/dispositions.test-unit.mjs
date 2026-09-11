import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { describe, test } from 'node:test';

import { validateSemanticDispositions } from './dispositions.mjs';

const fixture = JSON.parse(readFileSync('fixtures/conformance-cases.json', 'utf8'));
const dispositions = JSON.parse(
  readFileSync('fixtures/semantic-evaluation-dispositions.json', 'utf8'),
);

describe('semantic evaluation dispositions', () => {
  test('maps all 57 former cases into the exact 74-case active inventory', () => {
    assert.equal(validateSemanticDispositions(dispositions, fixture.semanticCases), dispositions);
    assert.equal(new Set(dispositions.cases.map(({ formerId }) => formerId)).size, 57);
    assert.equal(new Set(fixture.semanticCases.map(({ id }) => id)).size, 74);
    assert.equal(
      fixture.semanticCases.some(({ id }) =>
        [
          'published-supported-target-not-installed',
          'experimental-target-not-production-ready',
        ].includes(id),
      ),
      false,
    );
    assert.deepEqual(
      dispositions.cases
        .filter(({ disposition }) => disposition === 'replaced-technical-boundary')
        .map(({ activeId }) => activeId)
        .sort(),
      ['published-target-not-installed', 'published-target-version-mismatch'],
    );
  });

  test('rejects missing and remapped former cases', () => {
    const missing = { ...dispositions, cases: dispositions.cases.slice(1) };
    assert.throws(() => validateSemanticDispositions(missing, fixture.semanticCases));

    const remapped = JSON.parse(JSON.stringify(dispositions));
    remapped.cases[0].activeId = remapped.cases[1].activeId;
    assert.throws(() => validateSemanticDispositions(remapped, fixture.semanticCases));
  });
});
