import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unrelated-documentation-review',
  setup: createSemanticCaseSetup('unrelated-documentation-review'),
  scenario:
    'An adopted repository has a documentation change outside canonical state, the managed README block, and every declared relationship.',
  operation: 'unrelated-documentation-review',
  input: {
    developerDirection:
      'Review the uncommitted change to docs/branding.md and report only actionable findings.',
    repositoryEvidence: [
      {
        claim: 'The repository has a canonical moldea manifest.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The root README contains the adopted-project routing block.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
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
  coverageClaimIds: ['activation-abstention'],
});
