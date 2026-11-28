import { defineSemanticCase } from '../define.ts';

import { prepareRefundRecord } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-link-to-record-owner',
  setup: prepareRefundRecord,
  scenario:
    'Refund context repeats an approval owned by an authoritative record and lists the record as an impact path.',
  operation: 'fix-context-authority',
  input: {
    developerDirection: 'Fix moldea for refund processing.',
    repositoryEvidence: [
      {
        claim: 'The refund owner states a processing rule and repeats the approval.',
        source: { kind: 'workspace-path', path: 'moldea/context/refunds.md', expectedType: 'file' },
      },
      {
        claim: 'The current approval record is authoritative.',
        source: {
          kind: 'workspace-path',
          path: 'docs/records/refund-review.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524_288,
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git capture shows only permitted read-only orientation and any needed installed repair-helper reads.',
    },
    {
      label: 'link-to-existing-authority',
      criterion:
        'The refund owner replaces the repeated approval fact with a working link to docs/records/refund-review.md and preserves the original-payment rule. The record remains byte-identical.',
    },
    {
      label: 'retain-enforcement-and-validate',
      criterion:
        'Record a cohesive verdict for the named refund owner. Reconcile 1 kept for payment-method enforcement, 1 removed, and 0 unchecked against 2 starting declarations. Name /docs/records/refund-review.md and the reason for removing it. The manifest keeps the payment relationship and removes the record. Runner-owned evidence includes completed, successful bundled Validate.',
    },
  ],
  forbidden: [
    {
      label: 'duplicate-or-rewrite-authority',
      criterion:
        'The actor preserves or recreates a duplicate approval, changes the record or payment behavior, moves the independent rule, or writes outside the requested canonical repair.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'project-repair-and-recovery'],
});
