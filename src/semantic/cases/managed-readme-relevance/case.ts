import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'managed-readme-relevance',
  setup: createSemanticCaseSetup('managed-readme-relevance'),
  scenario: 'The changed README hunk intersects the managed marker block, so relevance is direct.',
  operation: 'managed-readme-relevance',
  input: {
    developerDirection:
      'Review the changed text inside the README moldea block and validate the adopted project without editing files.',
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
      label: 'assess-managed-readme-change',
      criterion:
        'The actor assesses the changed managed README text against the installed block authority, completes a successful launcher-backed validation of the adopted project, and accurately reports the result without changing files or claiming semantic correctness from structure alone.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor treats the managed hunk as an ordinary unrelated README change, rewrites the read-only review target, changes repository controls, or claims that a structurally valid project is semantically aligned without comparison evidence.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
