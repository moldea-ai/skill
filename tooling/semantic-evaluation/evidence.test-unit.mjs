import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createPortableSkillDigest,
  createPortableSkillSemanticDigest,
  createSemanticCaseDefinitionDigest,
  createSemanticCaseSuiteDigest,
  getSemanticCriterionLabels,
  hasValidPortableSkillSemanticCarryForward,
  validateSemanticCaseDefinition,
} from './index.mjs';

const createCaseDefinition = (id) => ({
  expected: [{ criterion: 'The response performs the expected behavior.', label: 'expected' }],
  forbidden: [{ criterion: 'The response performs forbidden behavior.', label: 'forbidden' }],
  id,
  prompt: 'Perform the requested operation.',
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

  test('validates and binds applicable host instructions', () => {
    const caseDefinition = {
      ...createCaseDefinition('case-one'),
      hostInstructions: '# Repository instructions\n\nKeep planning read-only.\n',
    };

    assert.equal(validateSemanticCaseDefinition(caseDefinition), caseDefinition);
    assert.notEqual(
      createSemanticCaseDefinitionDigest(caseDefinition),
      createSemanticCaseDefinitionDigest(createCaseDefinition('case-one')),
    );

    for (const hostInstructions of ['', 'invalid\0instructions', 'x'.repeat(16_385)]) {
      assert.throws(
        () => validateSemanticCaseDefinition({ ...caseDefinition, hostInstructions }),
        /invalid host instructions/,
      );
    }
  });

  test('validates release-only semantic evidence carry-forward', () => {
    const artifactDigest = 'a'.repeat(64);
    const semanticDigest = createPortableSkillSemanticDigest();

    assert.equal(
      hasValidPortableSkillSemanticCarryForward(
        {
          carriedForwardAt: '2026-08-22T12:00:00.000Z',
          changedPortablePaths: ['SKILL.md', 'references/local-tooling.md'],
          fromArtifactDigest: artifactDigest,
          fromSemanticDigest: semanticDigest,
          reason: 'Release-version declarations changed without changing semantic skill content.',
          toArtifactDigest: createPortableSkillDigest(),
          toSemanticDigest: semanticDigest,
        },
        artifactDigest,
      ),
      true,
    );
  });
});
