// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { projectCodexEvaluationExecutionEvidence } from '../../execution/host/index.ts';
import { defineSemanticCase } from '../cases/index.ts';
import {
  createSemanticResultDimensions,
  getSemanticFailureClassifications,
  hasPassingSemanticResultDimensions,
  isSemanticConfirmationEligible,
} from './outcomes.ts';

const caseDefinition = defineSemanticCase({
  coverageClaimIds: ['synthetic-outcome'],
  expected: [{ criterion: 'The response is grounded.', label: 'grounded' }],
  forbidden: [{ criterion: 'The response invents facts.', label: 'invented' }],
  id: 'synthetic-outcome',
  input: {
    developerDirection: 'Describe the project.',
    repositoryEvidence: [
      { claim: 'The request is available.', source: { kind: 'developer-direction' } },
    ],
  },
  operation: 'describe-project',
  resourceBudget: {
    activation: 'abstain',
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
    minimumMoldeaCommands: 0,
  },
  scenario: 'A synthetic informational request.',
});

const commandPolicy = projectCodexEvaluationExecutionEvidence('').commandPolicy;
const resourceEvidence = {
  commandCount: 0,
  maximumInvocationByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  operations: [],
  stdoutByteCount: 0,
};

describe('semantic result dimensions', () => {
  test('selects the large-traversal host-output limit for explicit repair cases', () => {
    const actorCommandPolicy = {
      ...commandPolicy,
      completedCommandCount: 8,
      maximumCommandOutputByteCount: 200_000,
      modelVisibleToolOutputByteCount: 2_000_000,
    };
    const options = {
      actorCommandPolicy,
      actorResourceEvidence: resourceEvidence,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: true,
      judgeCommandPolicy: commandPolicy,
    };
    expect(createSemanticResultDimensions({ ...options, caseDefinition }).resource).toBe(false);
    const repairCase = defineSemanticCase({
      ...caseDefinition,
      resourceBudget: {
        activation: 'direct',
        maximumMoldeaCommands: 16,
        maximumMoldeaOutputBytes: 1_048_576,
        minimumMoldeaCommands: 0,
        profile: 'largeTraversal',
      },
    } as const);
    expect(
      createSemanticResultDimensions({ ...options, caseDefinition: repairCase }).resource,
    ).toBe(true);
    expect(
      createSemanticResultDimensions({
        ...options,
        actorCommandPolicy: {
          ...actorCommandPolicy,
          modelVisibleToolOutputByteCount: 4_194_305,
        },
        caseDefinition: repairCase,
      }).resource,
    ).toBe(false);
  });

  test('keeps semantic uncertainty eligible only when deterministic dimensions pass', () => {
    const dimensions = createSemanticResultDimensions({
      actorCommandPolicy: commandPolicy,
      actorResourceEvidence: resourceEvidence,
      caseDefinition,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: true,
      isSemanticPassing: false,
      judgeCommandPolicy: commandPolicy,
    });

    expect(isSemanticConfirmationEligible(dimensions)).toBe(true);
    expect(getSemanticFailureClassifications(dimensions)).toStrictEqual(['semantic']);
    expect(hasPassingSemanticResultDimensions(dimensions)).toBe(false);
  });

  test('does not use confirmations to conceal deterministic failures', () => {
    const dimensions = createSemanticResultDimensions({
      actorCommandPolicy: commandPolicy,
      actorResourceEvidence: resourceEvidence,
      caseDefinition,
      isMountIntegrityPassing: true,
      isRepositoryControlPassing: false,
      isSemanticPassing: false,
      judgeCommandPolicy: commandPolicy,
    });

    expect(isSemanticConfirmationEligible(dimensions)).toBe(false);
    expect(getSemanticFailureClassifications(dimensions)).toStrictEqual([
      'semantic',
      'repositoryControl',
    ]);
  });
});
