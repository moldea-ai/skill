import { defineSemanticCase } from '../define.ts';

import { prepareRefundRecord } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-link-to-record-owner',
  setup: prepareRefundRecord,
  scenario:
    'Refund context repeats an approval owned by an authoritative record and lists the record as an impact path.',
  operation: 'fix-context-authority',
  input: {
    developerDirection:
      'Fix moldea in the refund processing area. docs/records/refund-review.md owns the approval fact. Preserve the independent operating rule and keep the approval discoverable.',
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
        'The manifest keeps the payment rule relationship and removes the record path. The response explains that the record supplies authority rather than enforcing a rule. Runner-owned evidence includes completed, successful bundled Validate.',
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
