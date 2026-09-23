import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unrelated-task-expansion',
  setup: createSemanticCaseSetup('unrelated-task-expansion'),
  scenario:
    'A declared refund-policy path is initially relevant, while a formatter found through its import is unrelated to canonical relationships.',
  operation: 'implement-expanded-relevant-task',
  input: {
    developerDirection:
      'In src/refund-policy.js, lower the approval threshold to 500 units and add a unit suffix to its displayed refund label through the existing formatter. Complete relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The initially targeted refund-policy implementation is present.',
        source: { kind: 'workspace-path', path: 'src/refund-policy.js', expectedType: 'file' },
      },
      {
        claim: 'The manifest declares a refund-policy relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
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
      label: 'avoid-repeated-owner-scope',
      criterion:
        'The actor gates only the newly discovered formatter path, does not repeat scope for the already covered refund-policy path when that batch misses, and retains its earlier owner obligation.',
    },
    {
      label: 'finish-existing-owner',
      criterion:
        'The actor updates the refund threshold, formatter, and declared refund context, then validates after canonical changes.',
    },
  ],
  forbidden: [
    {
      label: 'cancel-or-rescope-prior-match',
      criterion:
        'The actor drops the refund-context obligation or repeats a successful refund-policy scope query merely because an unrelated formatter path was added.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
