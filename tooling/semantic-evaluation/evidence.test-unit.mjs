import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  test('binds explicit local-probe behavior into each case definition', () => {
    const caseDefinition = {
      ...createCaseDefinition('runtime-case'),
      localProbe: {
        kind: 'runtime-compatibility-publication',
        variant: 'current-target',
      },
    };

    assert.equal(validateSemanticCaseDefinition(caseDefinition), caseDefinition);
    assert.notEqual(
      createSemanticCaseDefinitionDigest(caseDefinition),
      createSemanticCaseDefinitionDigest({
        ...caseDefinition,
        localProbe: {
          ...caseDefinition.localProbe,
          variant: 'future-target',
        },
      }),
    );
    assert.throws(
      () =>
        validateSemanticCaseDefinition({
          ...caseDefinition,
          localProbe: { ...caseDefinition.localProbe, variant: 'unsupported' },
        }),
      /structured scenario/,
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
    assert.throws(
      () =>
        validateSemanticCaseDefinition({
          ...caseDefinition,
          input: {
            ...caseDefinition.input,
            repositoryEvidence: [
              {
                claim: 'Host instructions own repository-wide constraints.',
                source: { kind: 'host-instructions' },
              },
            ],
          },
        }),
      /structured scenario/,
    );
  });

  test('accepts a direct zero-CLI budget only with independent skill-artifact evidence', () => {
    const caseDefinition = {
      ...createCaseDefinition('skill-artifact-case'),
      resourceBudget: {
        activation: 'direct',
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 0,
        maximumMoldeaOutputBytes: 0,
      },
      skillEvidence: {
        activationScenarios: [],
        artifacts: [{ role: 'authoritative-source', root: 'skills/release-review' }],
      },
    };

    assert.equal(validateSemanticCaseDefinition(caseDefinition), caseDefinition);
    assert.throws(
      () => validateSemanticCaseDefinition({ ...caseDefinition, skillEvidence: undefined }),
      /structured scenario/,
    );
    assert.throws(
      () =>
        validateSemanticCaseDefinition({
          ...caseDefinition,
          resourceBudget: {
            activation: 'direct',
            minimumMoldeaCommands: 1,
            maximumMoldeaCommands: 4,
            maximumMoldeaOutputBytes: 262_144,
          },
        }),
      /structured scenario/,
    );
  });

  test('accepts a blocked case that needs four bounded discovery calls', () => {
    const caseDefinition = {
      ...createCaseDefinition('blocked-discovery-case'),
      resourceBudget: {
        activation: 'blocked',
        minimumMoldeaCommands: 0,
        maximumMoldeaCommands: 4,
        maximumMoldeaOutputBytes: 65_536,
      },
    };

    assert.equal(validateSemanticCaseDefinition(caseDefinition), caseDefinition);
    assert.throws(
      () =>
        validateSemanticCaseDefinition({
          ...caseDefinition,
          resourceBudget: {
            ...caseDefinition.resourceBudget,
            maximumMoldeaCommands: 5,
          },
        }),
      /structured scenario/u,
    );
  });

  test('hashes every distributed skill byte', () => {
    assert.match(createPortableSkillDigest(), /^[a-f0-9]{64}$/);
  });

  test('rejects test artifacts from the portable skill tree', () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), 'moldea-portable-skill-'));

    try {
      mkdirSync(join(repositoryRoot, 'moldea', 'scripts'), { recursive: true });
      writeFileSync(join(repositoryRoot, 'moldea', 'SKILL.md'), '# Skill\n');
      writeFileSync(
        join(repositoryRoot, 'moldea', 'scripts', 'writer.test-unit.mjs'),
        'test artifact\n',
      );

      assert.throws(
        () => createPortableSkillDigest(repositoryRoot),
        /Portable skill contains a test artifact/u,
      );
    } finally {
      rmSync(repositoryRoot, { force: true, recursive: true });
    }
  });
});
