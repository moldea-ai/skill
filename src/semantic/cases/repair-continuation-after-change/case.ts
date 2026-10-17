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
        'Runner-owned gitInvocationEvidence.repair records at least one approved checkpoint Git invocation. Neither the actor wrapper records nor recognized command text contains a disallowed Git form, and captured command evidence is complete. Opaque or unparsed text alone is not a Git violation. These observations do not establish successful checkpoint capture or read history.',
    },
    {
      label: 'reassess-changed-and-checkpoint-paths',
      criterion:
        "The report identifies A, B, and E as current reassessments and gives their case-specific reasons; actual retrieval and reassessment require native trace verification. A's changed source contradicts its document and is reported or corrected. B is reassessed because its path was uncommitted at the checkpoint despite now matching baseline. E is reassessed because its source differs from the checkpoint commit. The report need not identify a merge as the historical cause; the approved comparison does not establish that history.",
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
        'Runner-owned actor wrapper records or recognized command text positively establish a disallowed Git form. Opaque or unparsed text alone is not proof of a violation.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
