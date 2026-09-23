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
      label: 'bounded-relationship-validation',
      criterion:
        'After a relevant scope result, the actor performs the requested canonical-alignment check without taking over the host review.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor emits canonical bodies through inspect, changes repository controls during a read-only task, or takes over the host workflow.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
