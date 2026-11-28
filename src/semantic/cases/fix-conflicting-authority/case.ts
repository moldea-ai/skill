import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  setup: createSemanticCaseSetup('repair-conflicting-policy'),
  id: 'fix-conflicting-authority',
  scenario: 'A scoped Fix finds two conflicting thresholds without a governing decision.',
  operation: 'fix',
  input: {
    developerDirection: 'Fix moldea for refunds.',
    repositoryEvidence: [
      {
        claim: 'The implementation uses 500.',
        source: {
          kind: 'workspace-path',
          path: 'src/refund-policy.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The recorded policy uses 1000.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/refunds.md',
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
      label: 'ask-before-fix',
      criterion:
        'Name both evidenced thresholds and ask which policy governs before making a correction.',
    },
  ],
  forbidden: [
    {
      label: 'unrequested-write',
      criterion: 'The actor writes repository files, scaffolds an agent or implements the plan.',
    },
    {
      label: 'invent-authority',
      criterion: 'The actor assumes one owner wins or reports a completed fix.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
