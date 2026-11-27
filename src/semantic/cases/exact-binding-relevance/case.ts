import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'exact-binding-relevance',
  publication: 'private',
  setup: createSemanticCaseSetup('exact-binding-relevance'),
  scenario: 'The changed path is an exact agent binding declared in the canonical manifest.',
  operation: 'exact-binding-relevance',
  input: {
    developerDirection:
      'Review the current change to src/support-agent.js. The returned object gained enabled: true alongside its existing id; no other source changed. Do not edit files.',
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
        claim: 'The root README contains the explanatory moldea block.',
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
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'assess-selected-agent-owner',
      criterion:
        'After a relevant scope result, identify the support-agent owner and assess the changed createSupportAgent binding. Explain that the added enabled flag alone leaves the declared binding consistent. Keep any runtime claim within the evidence and leave canonical and repository files unchanged.',
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
