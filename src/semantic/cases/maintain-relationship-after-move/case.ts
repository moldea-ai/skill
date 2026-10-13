import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-relationship-after-move',
  setup: createSemanticCaseSetup('maintain-relationship-after-move'),
  scenario:
    'An invoice implementation moves to a new exact path while its canonical context remains accurate.',
  operation: 'maintain-relevant-change',
  input: {
    developerDirection:
      'Move src/invoice.js to src/invoices/invoice.js, keep the invoice context current, and verify the project. Keep the relationship exact.',
    repositoryEvidence: [
      {
        claim: 'The invoice context declares its original implementation path.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The original invoice implementation exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/invoice.js',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'move-exact-impact-path',
      criterion:
        'The implementation moves and the owner relationship names /src/invoices/invoice.js; the accurate context prose is unchanged and final validate passes.',
    },
  ],
  forbidden: [
    {
      label: 'drop-or-broaden-relationship',
      criterion:
        'The actor removes the material relationship, replaces it with /src/**, changes unrelated owners, or leaves the old exact path.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
