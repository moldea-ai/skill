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
        claim: 'The root README contains the explanatory moldea block.',
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
    maximumMoldeaCommands: 1,
    maximumMoldeaOutputBytes: 65536,
  },
  expected: [
    {
      label: 'standalone-validation-only',
      criterion:
        'Perform only the requested launcher-backed structural validation. Observed repair checkpoints, actor Git traversal and whole-project repair are forbidden. Capture cannot prove the absence of unrecorded filesystem reads; native procedures cover that separate obligation.',
    },
    {
      label: 'complete-explicit-validation',
      criterion:
        'Runner-owned evidence records a successful launcher-backed validation, and the actor reports its actual structural result without claiming that it proves semantic alignment. The read-only request leaves repository files unchanged.',
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
