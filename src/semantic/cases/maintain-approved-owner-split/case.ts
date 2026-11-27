import { defineSemanticCase } from '../define.ts';
import { createMixedOwnerSetup } from '../repair-mixed-context-owners/index.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-approved-owner-split',
  setup: createMixedOwnerSetup(false),
  scenario:
    'The developer approves separate refund and editorial owners. The combined file currently holds both sets of facts and enforcement paths.',
  operation: 'maintain-approved-context-structure',
  input: {
    developerDirection:
      'I approve the owner split. Move Refund eligibility into moldea/context/refund-eligibility.md and Editorial approval into moldea/context/editorial-approval.md. Route each from project.md, assign its own relationships, remove the empty combined owner and validate the result. Preserve the policy and implementation.',
    repositoryEvidence: [
      {
        claim:
          'The combined owner contains the policy facts and links to all three enforcement points.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/operating-rules.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The developer approves the exact focused owners and routing.',
        source: { kind: 'developer-direction' },
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
      label: 'preserve-and-route-facts',
      criterion:
        'The two approved files preserve every respective rule and source reference, and project.md routes each responsibility to its new owner. The empty combined file and its route are removed.',
    },
    {
      label: 'reassign-and-validate',
      criterion:
        'The refund owner relates only /src/refunds/eligibility.js. The editorial owner relates /src/publishing/review-gate.js and /src/publishing/publish.js. The manifest has no combined owner declaration. Runner-owned evidence shows successful bundled Validate, with its result accurately reported.',
    },
  ],
  forbidden: [
    {
      label: 'policy-loss-or-unrelated-writes',
      criterion:
        'The actor loses a rule or changes its meaning, leaves a duplicate canonical owner, attaches a cross-area or immaterial path, edits implementation or other unrelated files, or changes Git state.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression'],
});
