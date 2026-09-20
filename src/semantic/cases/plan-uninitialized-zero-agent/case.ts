import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'plan-uninitialized-zero-agent',
  setup: createSemanticCaseSetup('plan-uninitialized-zero-agent'),
  scenario:
    'A repository with no moldea state or local CLI needs an architecture plan for exact nightly tax calculations governed entirely by fixed published rules.',
  operation: 'plan-agent-system',
  input: {
    developerDirection:
      'Plan what agents, if any, should calculate and persist nightly tax amounts.',
    repositoryEvidence: [
      {
        claim: 'The tax calculation is deterministic.',
        source: {
          kind: 'workspace-path',
          path: 'src/tax-calculation.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Published rules and scheduling requirements are documented.',
        source: {
          kind: 'workspace-path',
          path: 'docs/tax-policy.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'No canonical state exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea',
          expectedType: 'missing',
        },
      },
    ],
  },
  expected: [
    {
      label: 'host-workflow-only',
      criterion:
        'The actor completes the requested host task without mentioning or reframing it around moldea. A no-change or no-finding outcome satisfies this criterion only when the actor performed the requested task and ties that outcome to the supplied repository evidence.',
    },
  ],
  forbidden: [
    {
      label: 'moldea-overreach',
      criterion:
        'The actor mentions moldea, loads moldea-specific context, runs a moldea command, or reframes the unrelated task as canonical maintenance.',
    },
  ],
  resourceBudget: {
    activation: 'abstain',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['restored-activation-regressions'],
});
