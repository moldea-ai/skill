// @vitest-environment node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { createSemanticCoverageDigest, validateSemanticCoverage } from './coverage.mjs';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const caseDefinitions = JSON.parse(
  readFileSync(join(repositoryRoot, 'fixtures', 'conformance-cases.json'), 'utf8'),
).semanticCases;
const coverage = JSON.parse(
  readFileSync(join(repositoryRoot, 'fixtures', 'semantic-evaluation-coverage.json'), 'utf8'),
);

test('coverage binds every semantic case to an explicit portable-skill claim', () => {
  assert.equal(validateSemanticCoverage(coverage, caseDefinitions), coverage);
  assert.match(createSemanticCoverageDigest(coverage, caseDefinitions), /^[a-f0-9]{64}$/u);

  const referencedCaseIds = new Set(
    coverage.claims.flatMap(({ evidence }) =>
      evidence.filter(({ kind }) => kind === 'semantic-case').map(({ id }) => id),
    ),
  );
  assert.deepEqual([...referencedCaseIds].sort(), caseDefinitions.map(({ id }) => id).sort());

  for (const { sourcePaths } of coverage.claims) {
    for (const sourcePath of sourcePaths) {
      const [relativePath, headingId] = sourcePath.split('#');
      const absolutePath = join(repositoryRoot, relativePath);
      assert.equal(existsSync(absolutePath), true, sourcePath);
      if (headingId === undefined) continue;

      const headingIds = readFileSync(absolutePath, 'utf8')
        .split('\n')
        .filter((line) => /^#{1,6} /u.test(line))
        .map((line) =>
          line
            .replace(/^#{1,6} /u, '')
            .toLowerCase()
            .replace(/[`*]/gu, '')
            .replace(/[^a-z0-9 -]/gu, '')
            .trim()
            .replace(/ +/gu, '-'),
        );
      assert.equal(headingIds.includes(headingId), true, sourcePath);
    }
  }

  const activationClaim = coverage.claims.find(({ id }) => id === 'activation-and-adoption');
  const activationCaseIds = new Set(
    activationClaim?.evidence.filter(({ kind }) => kind === 'semantic-case').map(({ id }) => id),
  );

  assert.match(
    activationClaim?.description ?? '',
    /knowledge- and relevance-triggered maintenance/i,
  );
  for (const caseId of [
    'unadopted-direct-context-handoff',
    'adopted-direct-context-handoff',
    'adopted-explicit-context-correction',
    'adopted-ambiguous-context-handoff',
  ]) {
    assert.equal(activationCaseIds.has(caseId), true);
  }

  const compressionClaim = coverage.claims.find(
    ({ id }) => id === 'context-quality-and-compression',
  );
  const compressionCaseIds = new Set(
    compressionClaim?.evidence.filter(({ kind }) => kind === 'semantic-case').map(({ id }) => id),
  );

  assert.match(compressionClaim?.description ?? '', /explicit context compression/i);
  assert.deepEqual([...compressionCaseIds].sort(), [
    'compress-conflicting-project-context',
    'compress-project-context',
    'maintain-context-without-duplication',
  ]);
});

test('coverage rejects unknown and uncovered semantic cases', () => {
  const unknownCoverage = structuredClone(coverage);
  unknownCoverage.claims[0].evidence.push({ id: 'unknown-case', kind: 'semantic-case' });
  assert.throws(
    () => validateSemanticCoverage(unknownCoverage, caseDefinitions),
    /unknown case unknown-case/,
  );

  assert.throws(
    () => validateSemanticCoverage(coverage, [...caseDefinitions, { id: 'uncovered-case' }]),
    /omits cases: uncovered-case/,
  );
});
