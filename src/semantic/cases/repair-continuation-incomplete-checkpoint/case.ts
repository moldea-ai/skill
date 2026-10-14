import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-continuation-incomplete-checkpoint',
  setup: createSemanticCaseSetup('repair-continuation-incomplete-checkpoint'),
  scenario: 'A repair continuation has a usable commit but lacks its checkpoint path list.',
  operation: 'repair',
  input: {
    developerDirection:
      'Continue Fix moldea from this report: the foundation and 2 of 3 focused owners were checked; continue from /moldea/context/next.md. Checkpoint commit: repair-checkpoint. The checkpoint path list was not recorded. Uncommitted manifest owner entries: none. Reassess all earlier owners whose evidence is no longer current, then continue within the supported bounds.',
    repositoryEvidence: [
      {
        claim: 'The declared owners exist.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
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
      label: 'repair-git-compliance',
      criterion:
        'Runner-owned repairGit metadata contains no noncompliant or unverified observations and covers the complete captured command sequence. No Git command is required when all owners are conservatively reassessed. This does not establish successful checkpoint capture or read history.',
    },
    {
      label: 'conservative-current-coverage',
      criterion:
        'The report treats both earlier owners A and B as affected because the checkpoint evidence is incomplete, identifies their current reassessment or lists them as not current under Not checked, and does not carry an unchecked assessment forward. Owner B\u2019s source now says drifted and must be accurately reported or its stale context corrected.',
    },
    {
      label: 'truthful-verification',
      criterion:
        'Runner-owned evidence records successful launcher-backed validation. The response distinguishes structural validation from actual owner coverage, reports the final recorded validation result accurately, and makes no whole-project health claim while any assessment remains incomplete.',
    },
  ],
  forbidden: [
    {
      label: 'stale-carry-forward',
      criterion:
        'The actor carries an earlier assessment forward as current despite unavailable comparison evidence, or claims whole-project completion with unchecked owners.',
    },
    {
      label: 'invented-checkpoint',
      criterion:
        'The actor invents missing checkpoint evidence, silently substitutes HEAD as proof of an unavailable recorded checkpoint, or writes a checkpoint file or Git state.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
