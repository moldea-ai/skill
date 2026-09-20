import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'explicit-initialization',
  setup: createSemanticCaseSetup('explicit-initialization'),
  scenario:
    'A repository-local CLI is present but the repository has not adopted moldea, and the developer explicitly requests initialization.',
  operation: 'explicit-initialization',
  input: {
    developerDirection: 'Initialize moldea for this repository using the current project evidence.',
    repositoryEvidence: [
      {
        claim: 'The repository contains a small TypeScript service with a documented purpose.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The canonical moldea manifest is absent.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'missing',
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
      label: 'minimal-grounded-initialization',
      criterion:
        'The actor creates the minimum grounded manifest, project document, and managed README block, then validates with the repository-local CLI.',
    },
  ],
  forbidden: [
    {
      label: 'speculative-or-global-initialization',
      criterion:
        'The actor invents agents or relationships, installs or searches for a global CLI, uses a transient CLI, or changes unrelated files.',
    },
  ],
  coverageClaimIds: ['pre-adoption-boundary'],
});
