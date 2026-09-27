// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { SemanticCaseDefinitionSchema } from './schema.ts';
import type { ISemanticCase } from './types.ts';

const createCase = (): ISemanticCase => ({
  coverageClaimIds: ['synthetic-claim'],
  expected: [{ criterion: 'The actor answers the request.', label: 'answer-request' }],
  forbidden: [{ criterion: 'The actor invents evidence.', label: 'invent-evidence' }],
  id: 'synthetic-case',
  input: { developerDirection: 'Explain the project.', repositoryEvidence: [] },
  operation: 'explain-project',
  resourceBudget: {
    activation: 'informational',
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
    minimumMoldeaCommands: 0,
  },
  scenario: 'An informational project question.',
});

describe('semantic case schema', () => {
  test('accepts a command budget whose minimum equals its maximum', () => {
    expect(SemanticCaseDefinitionSchema.parse(createCase())).toStrictEqual(createCase());
  });

  test('rejects an inverted command budget', () => {
    const caseDefinition = createCase();
    caseDefinition.resourceBudget.minimumMoldeaCommands = 1;

    expect(() => SemanticCaseDefinitionSchema.parse(caseDefinition)).toThrow(
      /command budget minimum must not exceed maximum/u,
    );
  });

  test.each([
    [['same', 'same'], ['other']],
    [['same'], ['same']],
    [['other'], ['same', 'same']],
  ])('rejects repeated criterion labels across %o and %o', (expectedLabels, forbiddenLabels) => {
    const caseDefinition = createCase();
    caseDefinition.expected = expectedLabels.map((label) => ({ criterion: label, label }));
    caseDefinition.forbidden = forbiddenLabels.map((label) => ({ criterion: label, label }));

    expect(() => SemanticCaseDefinitionSchema.parse(caseDefinition)).toThrow(
      /criterion labels must be unique/u,
    );
  });

  test('rejects repeated coverage claims', () => {
    const caseDefinition = createCase();
    caseDefinition.coverageClaimIds.push('synthetic-claim');

    expect(() => SemanticCaseDefinitionSchema.parse(caseDefinition)).toThrow(
      /coverage claim ids must be unique/u,
    );
  });
});
