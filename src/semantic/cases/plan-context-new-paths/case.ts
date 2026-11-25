import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('plan-context-routed-refund'),
  id: 'plan-context-new-paths',
  scenario: 'The plan names only proposed paths that cannot match a relationship.',
  operation: 'plan-product-change',
  input: {
    developerDirection:
      'Plan larger-refund support in the new files src/refund-approval.js and src/refund-approval.test-unit.js. Keep the request read-only.',
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
        "Use the adopted project purpose and Billing's actual human-approval rule for refunds greater than 50,000 cents, even for otherwise eligible orders. Identify Billing as the governing owner and preserve files.",
    },
    {
      label: 'select-focused-context',
      criterion: 'Use the routing in project.md to select Billing for refund behavior.',
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
