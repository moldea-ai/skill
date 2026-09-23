import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'expanding-task-relevance',
  setup: createSemanticCaseSetup('expanding-task-relevance'),
  scenario:
    'An initially unrelated checkout path imports a refund-policy module whose declared relationship becomes relevant only after normal implementation discovery.',
  operation: 'implement-expanding-task',
  input: {
    developerDirection:
      'In src/checkout.js, change the shared refund approval behavior used for cancellations so amounts above 500 units require approval. Complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim:
          'The initially targeted checkout implementation is present; its dependencies have not been supplied as task paths.',
        source: { kind: 'workspace-path', path: 'src/checkout.js', expectedType: 'file' },
      },
      {
        claim: 'The repository has an adopted moldea foundation.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'reconsider-newly-discovered-path',
      criterion:
        'After the checkout dependency reveals the refund-policy path, the actor gates that newly discovered path, scopes its declared owner, and completes the shared threshold change.',
    },
    {
      label: 'maintain-new-owner',
      criterion:
        'The actor updates the refund-policy context to the 500-unit threshold and validates after its canonical write.',
    },
  ],
  forbidden: [
    {
      label: 'one-shot-miss',
      criterion:
        'The actor treats the initial checkout-path miss as permanent after normal work reveals a newly relevant implementation path.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
