import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('plan-context-routed-refund'),
  id: 'plan-context-no-paths',
  scenario: 'A product behavior plan names no file.',
  operation: 'plan-product-change',
  input: {
    developerDirection:
      'Plan how to support larger refunds in this product. Keep the request read-only.',
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
        'Cite and apply the governing Billing guidance. Require human approval for refunds over 50,000 cents, including otherwise eligible orders. Use established project purpose where it changes a material choice and keep the plan read-only.',
    },
    {
      label: 'select-focused-context',
      criterion:
        'The plan cites and applies the governing Billing context for refund behavior. Native review separately checks successful focused reads of moldea/project.md and its Billing target in both the diagnostic and official trials. The semantic judge assesses the cited and applied context without requiring a response explanation of the route or read order.',
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
