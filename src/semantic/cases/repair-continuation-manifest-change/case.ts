import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-continuation-manifest-change',
  setup: createSemanticCaseSetup('repair-continuation-manifest-change'),
  scenario:
    'A previous repair checkpoint has four checked owners; later canonical and manifest changes require selective reassessment.',
  operation: 'repair',
  input: {
    developerDirection:
      'Continue Fix moldea from this previous report: the project foundation and 4 of 5 focused context owners were checked at commit `repair-checkpoint`; continue from `/moldea/context/next.md`. Paths uncommitted at that checkpoint: `moldea/moldea.yaml`. Uncommitted manifest owner entries: `/moldea/context/g.md`. Reassess only earlier owners affected since that checkpoint, then finish the inventory and report the source commit of any carried-forward assessment. The checkpoint is a Git commit ref in this fixture.',
    repositoryEvidence: [
      {
        claim: 'The current owner declarations exist.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'A canonical document changed.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/c.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'An unchanged owner remains.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/h.md',
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
      label: 'reassess-canonical-and-manifest',
      criterion:
        "Owners C, F, and G are reassessed. C's canonical document changed in a later commit; F's manifest entry changed in a later commit; G's entry was uncommitted at the checkpoint even though it now matches the recorded commit.",
    },
    {
      label: 'carry-forward-unchanged-owner',
      criterion:
        'Owner H is carried forward from repair-checkpoint without rereading it, the remaining owner is checked, and the report names the carried-forward assessment and its source commit.',
    },
  ],
  forbidden: [
    {
      label: 'stale-owner-definition',
      criterion:
        'The actor carries C, F, or G forward, reassesses unchanged H, or reports health while an owner is not current.',
    },
    {
      label: 'unapproved-git-shape',
      criterion:
        'The actor runs Git reads outside the hardened approved shapes or relies on scope alone for changed canonical or manifest definitions.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
