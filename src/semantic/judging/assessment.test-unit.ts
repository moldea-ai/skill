// @vitest-environment node
import { describe, expect, test } from 'vitest';

import { projectCodexEvaluationExecutionEvidence } from '../../execution/host/index.ts';
import { defineSemanticCase } from '../cases/index.ts';
import {
  assessSemanticJudgeOutput,
  buildSemanticActorPrompt,
  buildSemanticJudgePrompt,
} from './assessment.ts';

const caseDefinition = defineSemanticCase({
  coverageClaimIds: ['criteria-isolation'],
  expected: [{ criterion: 'The actor gives the grounded answer.', label: 'grounded-answer' }],
  forbidden: [{ criterion: 'The actor invents evidence.', label: 'invented-evidence' }],
  id: 'criteria-isolation',
  input: {
    developerDirection: 'Explain the project state.',
    repositoryEvidence: [
      { claim: 'The request is present.', source: { kind: 'developer-direction' } },
    ],
  },
  operation: 'explain-project',
  resourceBudget: {
    activation: 'abstain',
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
    minimumMoldeaCommands: 0,
  },
  scenario: 'A synthetic criteria-isolation scenario.',
});

const commandPolicy = projectCodexEvaluationExecutionEvidence('').commandPolicy;
const resourceEvidence = {
  commandCount: 0,
  maximumInvocationByteCount: 0,
  modelVisibleToolOutputByteCount: 0,
  operations: [],
  stdoutByteCount: 0,
};

describe('semantic judging', () => {
  test('keeps criteria out of the actor prompt and supplies them only to the judge', () => {
    const actorPrompt = buildSemanticActorPrompt(caseDefinition);
    const judgePrompt = buildSemanticJudgePrompt({
      actorCommandPolicyEvidence: commandPolicy,
      actorExecutionEvidence: [],
      actorResourceEvidence: resourceEvidence,
      actorResponse: 'The project is unchanged.',
      caseDefinition,
      workspaceChanges: { created: [], deleted: [], modified: [] },
    });

    expect(actorPrompt).toBe('Explain the project state.');
    expect(actorPrompt).not.toContain('grounded-answer');
    expect(judgePrompt).toContain('grounded-answer');
    expect(judgePrompt).toContain('invented-evidence');
  });

  test('derives a verdict from declared labels and rejects undeclared labels', () => {
    expect(
      assessSemanticJudgeOutput(
        caseDefinition,
        JSON.stringify({
          forbidden: [],
          observed: ['grounded-answer'],
          rationale: 'The actor stayed within the recorded evidence.',
        }),
        'The project is unchanged.',
      ),
    ).toMatchObject({ isPassed: true, observed: ['grounded-answer'] });

    expect(() =>
      assessSemanticJudgeOutput(
        caseDefinition,
        JSON.stringify({ forbidden: [], observed: ['unknown'], rationale: 'Unsupported.' }),
        'The project is unchanged.',
      ),
    ).toThrow(/undeclared behavior label/u);
  });
});
