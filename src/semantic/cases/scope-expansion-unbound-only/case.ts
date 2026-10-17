import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'scope-expansion-unbound-only',
  setup: createSemanticCaseSetup('scope-expansion-unbound-only'),
  scenario:
    'An unbound checkout task exposes another unbound implementation dependency in an adopted repository.',
  operation: 'implement-unbound-dependency',
  input: {
    developerDirection:
      'In src/checkout.js, lower the shared cancellation approval threshold to 500 units. Complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim:
          'The fixture has exactly two project-native tests: src/refund-policy.test-unit.js checks requiresApproval and src/checkout.test-unit.js checks cancelOrder through the shared policy. Each starts with boundary assertions at 1000 and 1001; the requested behavior requires 500 to need no approval and 501 to require approval.',
        source: { kind: 'workspace-path', path: 'src/checkout.test-unit.js', expectedType: 'file' },
      },
      {
        claim:
          'The starting src/checkout.js imports requiresApproval from ./refund-policy.js, and cancelOrder(amount) returns { approvalRequired: requiresApproval(amount) }. An unchanged checkout.js retains this delegation; its body need not appear in the final delta.',
        source: { kind: 'workspace-path', path: 'src/checkout.js', expectedType: 'file' },
      },
      {
        claim: 'The repository is adopted but neither task path has a declared relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'complete-unbound-host-task',
      criterion:
        'The final shared refund policy requires approval above 500 units, checkout delegates to that policy (including when its starting implementation is unchanged), and both project-native test sources contain meaningful 500/501 boundary assertions. Runner evidence records at least two passing unit tests with no failures, and the actor reports completing the relevant checks; exact test names are outside the evidence contract. The actor completes ordinary work without canonical changes or a moldea CLI call.',
    },
  ],
  forbidden: [
    {
      label: 'invent-unbound-relevance',
      criterion:
        'The actor reads or writes canonical context, invokes the moldea CLI, adds a speculative relationship, or leaves the requested checkout behavior incomplete.',
    },
  ],
  coverageClaimIds: ['activation-abstention', 'bounded-relevance'],
});
