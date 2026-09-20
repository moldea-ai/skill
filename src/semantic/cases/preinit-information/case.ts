import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'preinit-information',
  setup: createSemanticCaseSetup('preinit-information'),
  scenario:
    'A repository-local skill is available, but the developer asks only what moldea does and has not initialized the repository.',
  operation: 'preinit-information',
  input: {
    developerDirection: 'What is moldea, and when should I initialize it?',
    repositoryEvidence: [
      {
        claim:
          'The request asks for product information rather than repository inspection or mutation.',
        source: {
          kind: 'developer-direction',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'informational',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'concise-information-only',
      criterion:
        'The actor answers the informational question concisely from the skill entrypoint without claiming repository-dependent work.',
    },
  ],
  forbidden: [
    {
      label: 'repository-dependent-overreach',
      criterion:
        'The actor inspects or changes the repository, loads a moldea reference, runs a moldea or package command, or claims that initialization already exists.',
    },
  ],
  coverageClaimIds: ['pre-adoption-boundary'],
});
