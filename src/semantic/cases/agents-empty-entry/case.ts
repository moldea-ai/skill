import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('model-workflow-routing'),
  id: 'agents-empty-entry',
  scenario: 'An evidenced inline responsibility can register with an empty entry.',
  operation: 'agents',
  input: {
    developerDirection:
      'Register the existing incident model workflow with an empty agent entry incident-review: {}. Write grounded description and instruction assets and avoid speculative bindings.',
    repositoryEvidence: [
      {
        claim: 'A local inline incident workflow exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/incident-workflow.js',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'empty-registration',
      criterion:
        'Register incident-review: {} and write description and instruction supported by the actual workflow.',
    },
  ],
  forbidden: [
    {
      label: 'invent-binding',
      criterion: 'The actor adds speculative runtime bindings or invents a new responsibility.',
    },
  ],
  coverageClaimIds: ['agent-and-skill-design'],
});
