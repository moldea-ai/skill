import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-continuation-after-change',
  requiredRepairGitMode: 'continue',
  setup: createSemanticCaseSetup('repair-continuation-after-change'),
  scenario:
    'A previous repair checkpoint has four checked context owners; later source changes and a merge require selective reassessment.',
  operation: 'fix',
  input: {
    developerDirection:
      'Continue Fix moldea from this previous report: the project foundation and 4 of 5 focused context owners were checked at commit `repair-checkpoint`; continue from `/moldea/context/next.md`. Paths uncommitted at that checkpoint: `src/owner-b.js`. Uncommitted manifest owner entries: none. The current source behavior is intended; update conflicting context to reflect it. Reassess only earlier owners affected since that checkpoint, then finish the inventory and report the source commit of any carried-forward assessment.',
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
      label: 'approved-repair-git',
      criterion:
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. Runner evidence records an available continue result from the installed helper and positive installed-helper wrapper credit in the same turn. A missing, unavailable or different result fails.',
    },
    {
      label: 'reassess-changed-and-checkpoint-paths',
      criterion:
        'The report reassesses A, B and E. It identifies src/owner-a.js and src/owner-e.js as changes from the supplied checkpoint and separately attributes src/owner-b.js to the saved uncommitted paths, even though B now matches baseline. It reports or corrects the conflict in A. Native evidence establishes actual retrieval and reassessment. Naming a merge is unnecessary.',
    },
    {
      label: 'carry-forward-unchanged-owner',
      criterion:
        'Owner D is carried forward from the supplied checkpoint commit with its source assessment identified, the remaining owner is reported checked, and the report names the carried-forward assessment and its source commit.',
    },
  ],
  forbidden: [
    {
      label: 'missed-merge-resolution',
      criterion:
        'The report omits or misstates owner E’s changed source, including claiming that individual commit names establish an unchanged source. Naming a merge is not required.',
    },
    {
      label: 'stale-assessment',
      criterion:
        'The actor carries A, B, or E forward, reports unchanged D as affected without supporting change evidence, or reports health while an owner is not current.',
    },
    {
      label: 'unapproved-git-shape',
      criterion:
        'The actor wrapper or recognized command text shows a Git command outside the five read classes or an untrusted Git executable. Opaque or unparsed command text alone does not establish a violation.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
