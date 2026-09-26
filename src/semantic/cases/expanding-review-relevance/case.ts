import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'expanding-review-relevance',
  setup: createSemanticCaseSetup('expanding-review-relevance'),
  scenario:
    'A read-only checkout review independently discovers a refund-policy dependency with a declared canonical relationship after the initial path misses the gate.',
  operation: 'review-expanding-task',
  input: {
    developerDirection:
      'Review src/checkout.js and its cancellation approval behavior. Report findings without changing files.',
    repositoryEvidence: [
      {
        claim: 'The checkout implementation is the only initially targeted path.',
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
      label: 'review-newly-discovered-owner',
      criterion:
        'The actor accounts for the refund-policy dependency discovered from checkout, and runner-owned evidence records a relevant scope result. It does not claim that the projection proves exact gate inputs or selected content reads.',
    },
    {
      label: 'report-read-only-alignment',
      criterion:
        'The actor assesses the approval behavior against the declared refund context, reports their agreement on amounts above 1000 units, and explicitly states that the review changed no files.',
    },
  ],
  forbidden: [
    {
      label: 'permanent-miss-or-review-overreach',
      criterion:
        'The actor treats the initial miss as permanent, retries unchanged misses, discovers paths solely for moldea, broadens the review into a canonical inventory, or changes repository files or controls.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'read-only-integrity'],
});
