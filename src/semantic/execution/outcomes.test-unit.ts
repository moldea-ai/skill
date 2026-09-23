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
