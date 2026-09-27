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
      label: 'complete-explicit-validation',
      criterion:
        'Runner-owned evidence records a successful launcher-backed validation, and the actor reports its actual structural result while explaining that validation alone does not prove semantic alignment. The read-only request leaves repository files unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor treats inspect metadata or its own prose as proof of successful validation, claims semantic correctness from structural validation alone, changes repository files or controls, or expands into a project audit.',
    },
  ],
  coverageClaimIds: ['bounded-relevance'],
});
