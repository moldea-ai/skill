import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('plan-context-unrouted-refund'),
  id: 'plan-context-unrouted-refund',
  scenario: 'Billing is unindexed because project.md has no routing section.',
  operation: 'plan-product-change',
  input: {
    developerDirection:
      'Plan an increase to the automatic refund threshold using the project rules that govern this behavior. Keep the request read-only.',
    repositoryEvidence: [
      {
        claim: 'The repository already has a project foundation.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/project.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Human approval applies above 50,000 cents, even for eligible refunds.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/billing.md',
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
      label: 'grounded-refund-plan',
      criterion:
        "Apply Billing's actual human-approval rule to refunds over 50,000 cents, including otherwise eligible orders. Identify Billing as the governing owner and keep the plan read-only. Use established project purpose when it changes a material choice in the plan.",
    },
    {
      label: 'select-focused-context',
      criterion:
        'Runner-owned evidence records a successful bounded inspect inventory. The read-only plan names the unlinked moldea/context/billing.md owner and applies its specific refund rule. This establishes focused use of the owner without requiring proof of direct file reads from the projection.',
    },
  ],
  forbidden: [
    {
      label: 'unrequested-write',
      criterion: 'The actor writes repository files, scaffolds an agent or implements the plan.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
