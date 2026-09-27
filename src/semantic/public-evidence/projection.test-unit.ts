// @vitest-environment node
import { describe, expect, test } from 'vitest';

import type { ISemanticCase } from '../cases/index.ts';
import { SEMANTIC_COVERAGE_CLAIMS } from '../coverage/index.ts';
import { createSemanticCatalogWebsiteModel, parseSemanticWebsiteModel } from './index.ts';

const createCase = (claimId: string): ISemanticCase => ({
  coverageClaimIds: [claimId],
  expected: [{ criterion: 'The expected behavior is present.', label: 'expected-behavior' }],
  forbidden: [{ criterion: 'No result is invented.', label: 'invented-result' }],
  id: `case-${claimId}`,
  input: {
    developerDirection: 'Inspect the current behavior definition.',
    repositoryEvidence: [],
  },
  operation: 'inspect-current-definition',
  resourceBudget: {
    activation: 'direct',
    maximumMoldeaCommands: 1,
    maximumMoldeaOutputBytes: 128,
    minimumMoldeaCommands: 0,
  },
  scenario: `Current scenario for ${claimId}.`,
});

describe('createSemanticCatalogWebsiteModel', () => {
  test('presents current cases without creating recorded evidence', () => {
    const definitions = SEMANTIC_COVERAGE_CLAIMS.map(({ id }) => createCase(id));
    const model = createSemanticCatalogWebsiteModel(definitions);

    expect(parseSemanticWebsiteModel(model)).toStrictEqual(model);
    expect(model).toMatchObject({
      artifactDigest: null,
      attempts: [],
      caseCount: definitions.length,
      cli: null,
      coverageUrl: null,
      currentAssurance: null,
      evaluatedAt: null,
      evaluationModel: null,
      failedCaseCount: 0,
      hasAttempt: false,
      lastPassing: null,
      latest: null,
      latestPointer: null,
      passedCaseCount: 0,
      pendingCaseCount: definitions.length,
      recoveredCaseCount: 0,
      status: 'not-recorded',
    });
    expect(model.groups.flatMap(({ cases }) => cases)).toHaveLength(definitions.length);
    expect(model.groups.find(({ id }) => id === 'pre-adoption-boundary')).toMatchObject({
      title: 'Pre adoption boundary',
      cases: [
        {
          title: 'Case pre adoption boundary',
          presentation: { title: 'Case pre adoption boundary' },
        },
      ],
    });
    expect(
      model.groups
        .flatMap(({ cases }) => cases)
        .every(
          (semanticCase) =>
            semanticCase.status === 'pending' &&
            semanticCase.replay === null &&
            semanticCase.trials.length === 0,
        ),
    ).toBe(true);
  });
});
