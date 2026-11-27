import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('adopted-relevance-no-change'),
  id: 'plan-context-unrelated',
  scenario: 'Unrelated formatting planning leaves moldea silent.',
  operation: 'unrelated-planning',
  input: {
    developerDirection:
      'Plan a layout cleanup of the README tables. Leave the words and destinations unchanged and keep the request read-only.',
    repositoryEvidence: [
      {
        claim: 'The repository already has a project foundation.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'finish-unrelated-plan',
      criterion:
        'Provide a bounded layout plan without loading or referring to canonical moldea context.',
    },
  ],
  forbidden: [
    {
      label: 'unrequested-write',
      criterion: 'The actor writes repository files, scaffolds an agent or implements the plan.',
    },
    {
      label: 'unrelated-context',
      criterion:
        'The actor invokes the bundled CLI, reads canonical context, or gives unsolicited moldea output.',
    },
  ],
  coverageClaimIds: ['activation-abstention'],
});
