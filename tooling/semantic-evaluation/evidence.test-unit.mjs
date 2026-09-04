import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createPortableSkillDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  getSemanticCriterionLabels,
  validateSemanticCaseDefinition,
} from './index.mjs';

const createCaseDefinition = (id) => ({
  expected: [{ criterion: 'The response performs the expected behavior.', label: 'expected' }],
  forbidden: [{ criterion: 'The response performs forbidden behavior.', label: 'forbidden' }],
  id,
  input: {
    developerDirection: 'Perform the requested operation.',
    repositoryEvidence: [
      {
        claim: 'The developer requested the operation.',
        source: { kind: 'developer-direction' },
      },
    ],
  },
  operation: 'perform-operation',
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  scenario: 'An adopted repository needs one operation.',
});

describe('semantic evaluation evidence', () => {
  test('validates criteria and returns their stable labels', () => {
    const caseDefinition = createCaseDefinition('case-one');

    assert.equal(validateSemanticCaseDefinition(caseDefinition), caseDefinition);
    assert.deepEqual(getSemanticCriterionLabels(caseDefinition.expected), ['expected']);
  });

  test('creates a suite digest independently of fixture order', () => {
    const first = createCaseDefinition('case-one');
    const second = createCaseDefinition('case-two');

    assert.equal(
      createSemanticCaseSuiteDigest([first, second]),
      createSemanticCaseSuiteDigest([second, first]),
    );
    assert.notEqual(
      createSemanticCaseDefinitionDigest(first),
      createSemanticCaseDefinitionDigest(second),
    );
  });

  test('rejects duplicate labels across expected and forbidden criteria', () => {
    const caseDefinition = createCaseDefinition('case-one');
    caseDefinition.forbidden[0].label = 'expected';

    assert.throws(
      () => validateSemanticCaseDefinition(caseDefinition),
      /duplicate evaluator labels/,
    );
  });

  test('rejects prompt-shaped cases and unsourced or unsafe evidence', () => {
    const caseDefinition = createCaseDefinition('case-one');

    assert.throws(
      () => validateSemanticCaseDefinition({ ...caseDefinition, prompt: 'Direct prompt.' }),
      /structured scenario/,
    );
    assert.throws(
      () => validateSemanticCaseDefinition({ ...caseDefinition, unexpected: true }),
      /structured scenario/,
    );
    assert.throws(
      () =>
        validateSemanticCaseDefinition({
          ...caseDefinition,
          input: {
            ...caseDefinition.input,
            repositoryEvidence: ['Unsourced claim.'],
          },
        }),
      /structured scenario/,
    );
    assert.throws(
      () =>
        validateSemanticCaseDefinition({
          ...caseDefinition,
          input: {
            ...caseDefinition.input,
            repositoryEvidence: [
              {
                claim: 'An unsafe path exists.',
                source: {
                  expectedType: 'file',
                  kind: 'workspace-path',
                  path: '../outside',
                },
              },
            ],
          },
        }),
      /structured scenario/,
    );
  });

  test('hashes every distributed skill byte', () => {
    assert.match(createPortableSkillDigest(), /^[a-f0-9]{64}$/);
  });
});
