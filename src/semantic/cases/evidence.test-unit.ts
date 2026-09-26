// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { defineSemanticCase } from './define.ts';
import {
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  validateSemanticCaseDefinition,
} from './evidence.ts';
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
  setup: async () => {},
});

describe('semantic case evidence', () => {
  test('validates a callback-bearing case without changing the returned case or its identity', () => {
    const caseDefinition = createCase();
    const serializableCase = { ...caseDefinition };
    delete serializableCase.setup;

    expect(defineSemanticCase(caseDefinition)).toBe(caseDefinition);
    expect(validateSemanticCaseDefinition(caseDefinition)).toBe(caseDefinition);
    expect(createSemanticCaseDefinitionDigest(caseDefinition)).toBe(
      createSemanticCaseDefinitionDigest(serializableCase),
    );
  });

  test('changes the case identity when grading metadata changes', () => {
    const caseDefinition = createCase();
    const changedCase = {
      ...caseDefinition,
      expected: [{ criterion: 'The actor answers with cited evidence.', label: 'answer-request' }],
    };

    expect(createSemanticCaseDefinitionDigest(changedCase)).not.toBe(
      createSemanticCaseDefinitionDigest(caseDefinition),
    );
  });

  test('applies shared validation at authoring, validation, and digest boundaries', () => {
    const caseDefinition = createCase();
    caseDefinition.forbidden[0] = {
      criterion: 'The actor invents evidence.',
      label: 'answer-request',
    };

    expect(() => defineSemanticCase(caseDefinition)).toThrow(/criterion labels must be unique/u);
    expect(() => validateSemanticCaseDefinition(caseDefinition)).toThrow(
      /criterion labels must be unique/u,
    );
    expect(() => createSemanticCaseDefinitionDigest(caseDefinition)).toThrow(
      /criterion labels must be unique/u,
    );
  });

  test('retains callback type checking at the authoring boundary', () => {
    const malformedCase = { ...createCase(), setup: 'not-a-callback' } as unknown as ISemanticCase;

    expect(() => defineSemanticCase(malformedCase)).toThrow(/setup must be a function/u);
  });

  test('hashes a case suite independently of declaration order and rejects repeated ids', () => {
    const firstCase = createCase();
    const secondCase = { ...createCase(), id: 'second-case' };

    expect(createSemanticCaseSuiteDigest([firstCase, secondCase])).toBe(
      createSemanticCaseSuiteDigest([secondCase, firstCase]),
    );
    expect(() => createSemanticCaseSuiteDigest([firstCase, firstCase])).toThrow(
      /case ids must be unique/u,
    );
  });
});
