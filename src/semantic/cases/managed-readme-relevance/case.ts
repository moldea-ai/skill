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
        claim:
          'The current managed README block matches the installed block after the changed hunk restores its canonical wording.',
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
        'The actor identifies the managed README block as relevant, reports whether its current text matches the installed block, completes successful launcher-backed validation, and accurately reports the structural result without changing files or claiming semantic correctness from it. The runner does not retain host read or comparison commands.',
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
