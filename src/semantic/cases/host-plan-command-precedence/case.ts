import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'host-plan-command-precedence',
  setup: createSemanticCaseSetup('host-plan-command-precedence'),
  scenario: 'A host planning command concerns ordinary source in an unadopted repository.',
  operation: 'host-plan-command-precedence',
  input: {
    developerDirection:
      'Use moldea to plan a focused change that adds cache invalidation to src/cache.js. Do not implement it.',
    repositoryEvidence: [
      {
        claim: 'The repository has ordinary source code.',
        source: {
          kind: 'workspace-path',
          path: 'src/http-client.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The repository has no canonical moldea directory.',
        source: {
          kind: 'workspace-path',
          path: 'moldea',
          expectedType: 'missing',
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
