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
      label: 'assess-selected-project-owner',
      criterion:
        'The actor treats the unchanged explicitly named /src/project-state.js as task-path evidence and, after a relevant scope result, assesses the selected /moldea/project.md owner against that implementation. It reports the supported alignment or precise limitation without rewriting canonical state merely because scope matched, and changes no files.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor requires a diff before testing the named path, runs Git solely to discover gate paths, runs inspect after successful scope to rediscover the owner, emits canonical bodies through inspect, changes files or repository controls, or takes over the host workflow.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
