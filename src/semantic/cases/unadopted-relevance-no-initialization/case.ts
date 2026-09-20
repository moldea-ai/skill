import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'unadopted-relevance-no-initialization',
  setup: createSemanticCaseSetup('unadopted-relevance-no-initialization'),
  scenario:
    'An ordinary implementation request occurs in a repository with no canonical state, marker block, or adoption direction.',
  operation: 'implement-unrelated-change',
  input: {
    developerDirection: 'Add exactly one retry for transient HTTP 5xx responses.',
    repositoryEvidence: [
      {
        claim: 'The repository contains application source.',
        source: {
          kind: 'workspace-path',
          path: 'src/http-client.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'No canonical moldea state exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea',
          expectedType: 'missing',
        },
      },
      {
        claim: 'The README has no adoption marker.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
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
    {
      label: 'authorized-retry-implemented',
      criterion:
        'The workspace changes add exactly one retry for transient HTTP 5xx responses to src/http-client.js without creating canonical moldea state.',
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
