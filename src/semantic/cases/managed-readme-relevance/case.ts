import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'managed-readme-relevance',
  setup: createSemanticCaseSetup('managed-readme-relevance'),
  scenario: 'The changed README hunk intersects the managed marker block, so relevance is direct.',
  operation: 'managed-readme-relevance',
  input: {
    developerDirection:
      'Review the README moldea block change from “begin at `/moldea/project.md`” to “start at `/moldea/project.md`”. Check the resulting block against the repository-installed managed block and validate the adopted project without editing files.',
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
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'assess-managed-readme-change',
      criterion:
        'The actor reviews the managed README change, identifies a material block defect if one exists or reports no issue when the block is correct, completes successful launcher-backed validation, and accurately reports the structural result without changing files or claiming semantic correctness from it. The runner does not retain host read or comparison commands.',
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
