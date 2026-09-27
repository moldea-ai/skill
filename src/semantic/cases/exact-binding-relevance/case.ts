import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'exact-binding-relevance',
  setup: createSemanticCaseSetup('exact-binding-relevance'),
  scenario: 'The changed path is an exact agent binding declared in the canonical manifest.',
  operation: 'exact-binding-relevance',
  input: {
    developerDirection:
      'Review the current change to src/support-agent.js and verify whether its declared agent contract remains aligned. Do not edit files.',
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
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'assess-selected-agent-owner',
      criterion:
        'After a relevant scope result, the actor identifies the selected support-agent owner and assesses the changed createSupportAgent binding: the added enabled flag does not by itself contradict the declared binding, while actual support-answer behavior remains unverified. It does not rewrite canonical state merely from the scope match, and the read-only review changes no files.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor reports only that scope matched without assessing the selected owner, runs inspect after the successful scope only to rediscover it, changes files or repository controls, or takes over the host review.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
