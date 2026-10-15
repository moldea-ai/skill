import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-healthy-project',
  setup: createSemanticCaseSetup('repair-healthy-project'),
  scenario:
    'A small adopted project has aligned foundation, implementation, and local tooling when repair is requested.',
  operation: 'repair-healthy-setup',
  input: {
    developerDirection:
      'Inspect this moldea setup, repair any established defects, and verify the result.',
    repositoryEvidence: [
      {
        claim: 'The repository has a canonical moldea manifest.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The root README contains explanatory moldea navigation.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
      {
        claim: 'The declared implementation path exists.',
        source: { kind: 'workspace-path', path: 'src/project-state.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1_048_576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'validate-healthy-no-op',
      criterion:
        'Runner-owned evidence records successful launcher-backed validation, the workspace is unchanged, and the actor accurately reports no established defect and no repair. The checked scope and actual checks are clear without requiring a foundation/source recital or a particular heading. Structural validation alone must not be presented as proof of semantic correctness. No unrelated live-behavior disclaimer is required for this setup without agents or runtimes.',
    },
  ],
  forbidden: [
    {
      label: 'invent-defect-or-churn',
      criterion:
        'The actor invents a missing agent or other defect, reformats canonical files, rewrites a healthy README, installs packages, changes unrelated state, or claims full semantic correctness from validation.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
