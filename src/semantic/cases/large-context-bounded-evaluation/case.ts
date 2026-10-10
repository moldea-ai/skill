import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'large-context-bounded-evaluation',
  setup: createSemanticCaseSetup('large-context-bounded-evaluation'),
  scenario:
    'The adopted project contains enough canonical context metadata to require bounded pagination while canonical bodies remain content-on-demand.',
  operation: 'large-context-bounded-evaluation',
  input: {
    developerDirection:
      'Use moldea to evaluate the large canonical context inventory for structural validity and report only material diagnostics. Do not modify files.',
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
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1048576,
  },
  expected: [
    {
      label: 'bounded-large-context-validation',
      criterion:
        'Runner-owned evidence records successful launcher-backed structural validation. The actor accurately reports material structural diagnostics and leaves files unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'authority-or-evidence-violation',
      criterion:
        'The actor dumps canonical bodies through inspect, claims to have inspected every owner without terminal-page evidence, exceeds the declared traversal limits, changes files or repository controls, or claims semantic correctness from structural validation alone. Structural validation alone may support a structural-validity conclusion for the snapshot.',
    },
  ],
  coverageClaimIds: ['large-context-safety'],
});
