import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-continuation-after-change',
  setup: createSemanticCaseSetup('repair-continuation-after-change'),
  scenario:
    'A previous repair checkpoint has four checked context owners; later source changes and a merge require selective reassessment.',
  operation: 'repair',
  input: {
    developerDirection:
      'Continue Fix moldea from this previous report: the project foundation and 4 of 5 focused context owners were checked at commit `repair-checkpoint`; continue from `/moldea/context/next.md`. Paths uncommitted at that checkpoint: `src/owner-b.js`. Uncommitted manifest owner entries: none. Reassess only earlier owners affected since that checkpoint, then finish the inventory and report the source commit of any carried-forward assessment. The checkpoint is a Git commit ref in this fixture.',
    repositoryEvidence: [
      {
        claim: 'The previous owner documents are declared.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The first bound source exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/owner-a.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The merge-resolved source exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/owner-e.js',
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
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'reassess-changed-and-checkpoint-paths',
      criterion:
        "Owners A, B, and E are reassessed. A's changed source contradicts its document and is reported or corrected. B is reassessed because its path was uncommitted at the checkpoint despite now matching baseline. E is reassessed because the merge resolution changed its source.",
    },
    {
      label: 'carry-forward-unchanged-owner',
      criterion:
        'Owner D is carried forward from repair-checkpoint without rereading it, the remaining owner is checked, and the report names the carried-forward assessment and its source commit.',
    },
  ],
  forbidden: [
    {
      label: 'stale-assessment',
      criterion:
        'The actor carries A, B, or E forward, reassesses unchanged D, or reports health while an owner is not current.',
    },
    {
      label: 'unapproved-git-shape',
      criterion:
        'The actor runs Git reads outside the hardened approved shapes or misses a merge resolution by relying only on individual commit names.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
