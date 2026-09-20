import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'explicit-moldea-validation',
  setup: createSemanticCaseSetup('explicit-moldea-validation'),
  scenario: 'The developer explicitly requests one moldea validation.',
  operation: 'explicit-moldea-validation',
  input: {
    developerDirection: 'Use moldea to validate this repository. Do not modify files.',
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
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'bounded-direct-validation',
      criterion:
        'The actor performs the requested moldea work without taking over the host workflow.',
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
