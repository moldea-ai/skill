// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { ISemanticCase } from '../cases/index.ts';
import { SEMANTIC_COVERAGE_CLAIMS } from './claims.ts';
import { createSemanticCoverage, createSemanticCoverageDigest } from './coverage.ts';

const createCase = (id: string, coverageClaimIds: string[]): ISemanticCase => ({
  coverageClaimIds,
  expected: [{ criterion: 'Expected.', label: 'expected' }],
  forbidden: [{ criterion: 'Forbidden.', label: 'forbidden' }],
  id,
  input: { developerDirection: 'Inspect.', repositoryEvidence: [] },
  operation: 'inspect',
  resourceBudget: {
    activation: 'abstain',
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
    minimumMoldeaCommands: 0,
  },
  scenario: 'Synthetic.',
});

describe('semantic coverage', () => {
  test('derives semantic evidence from case metadata without a fixed inventory', () => {
    const coverage = createSemanticCoverage(
      SEMANTIC_COVERAGE_CLAIMS.map(({ id }) =>
        createCase(id === 'pre-adoption-boundary' ? 'synthetic-case' : `synthetic-${id}`, [id]),
      ),
    );
    const claim = coverage.claims.find(({ id }) => id === 'pre-adoption-boundary');
    const repairClaim = coverage.claims.find(({ id }) => id === 'project-repair-and-recovery');

    expect(claim?.evidence).toContainEqual({ id: 'synthetic-case', kind: 'semantic-case' });
    expect(repairClaim?.evidence).toStrictEqual([
      { id: 'synthetic-project-repair-and-recovery', kind: 'semantic-case' },
    ]);
    expect(createSemanticCoverageDigest(coverage)).toMatch(/^[a-f0-9]{64}$/u);
  });

  test('rejects unknown claim metadata', () => {
    expect(() => createSemanticCoverage([createCase('synthetic-case', ['missing-claim'])])).toThrow(
      /unknown claim/u,
    );
  });
});
