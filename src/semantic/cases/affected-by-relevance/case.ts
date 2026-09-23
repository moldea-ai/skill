import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'affected-by-relevance',
  setup: createSemanticCaseSetup('affected-by-relevance'),
  scenario:
    'An unchanged path explicitly named by the developer exactly matches a canonical context affectedBy declaration.',
  operation: 'affected-by-relevance',
  input: {
    developerDirection:
      'Review src/project-state.js and report whether it agrees with the declared project behavior. Do not edit files.',
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
        'The actor treats the unchanged explicitly named path as task-path evidence and, after a relevant scope result, evaluates only its canonical owner without taking over the host review.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor requires a diff before testing the named path, runs Git solely to discover gate paths, emits canonical bodies through inspect, changes repository controls during a read-only task, or takes over the host workflow.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
