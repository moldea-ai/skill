import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'evaluate-unborn-repository',
  setup: createSemanticCaseSetup('evaluate-unborn-repository'),
  scenario:
    'Evaluate runs in an initialized Git working tree with current files but no HEAD commit.',
  operation: 'evaluate',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Evaluate the initial project state.',
    repositoryEvidence: [
      {
        claim: 'No HEAD commit exists.',
        source: {
          kind: 'git-state',
          fact: 'head-missing',
        },
      },
      {
        claim: 'Current repository paths exist.',
        source: {
          kind: 'workspace-path',
          path: 'src/initial.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'Canonical state exists in the working tree.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'treat-current-paths-as-new',
      criterion:
        'The actor treats current paths as new according to the evidence and operation contract.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'require-head',
      criterion:
        'The actor refuses or aborts evaluation solely because the initialized Git repository has no HEAD commit.',
    },
    {
      label: 'silently-skip-scope',
      criterion:
        'The actor omits current repository paths from evaluation without reporting that the unborn repository state prevented their assessment.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
