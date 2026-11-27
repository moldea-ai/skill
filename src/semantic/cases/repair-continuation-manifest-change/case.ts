import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-continuation-manifest-change',
  requiredRepairGitMode: 'continue',
  setup: createSemanticCaseSetup('repair-continuation-manifest-change'),
  scenario:
    'A previous repair checkpoint has four checked owners; later canonical and manifest changes require selective reassessment.',
  operation: 'fix',
  input: {
    developerDirection:
      'Continue Fix moldea from this previous report: the project foundation and 4 of 5 focused context owners were checked at commit `repair-checkpoint`; continue from `/moldea/context/next.md`. Paths uncommitted at that checkpoint: `moldea/moldea.yaml`. Uncommitted manifest owner entries: `/moldea/context/g.md`. Reassess only earlier owners affected since that checkpoint, then finish the inventory and report the source commit of any carried-forward assessment.',
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
      {
        claim:
          'The current committed F relationship selects /src/owner-f-policy.js, which implements the baseline stated by F. That owner definition is healthy; its change from the checkpoint-time path requires reassessment, not restoration.',
        source: {
          kind: 'workspace-path',
          path: 'src/owner-f-policy.js',
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
      label: 'reassess-canonical-and-manifest',
      criterion:
        "The report reassesses C, F and G. It identifies the changes from the supplied checkpoint in moldea/context/c.md and F's entry in moldea/moldea.yaml. It separately attributes G to its saved uncommitted entry, even though G now matches baseline. Native evidence establishes actual retrieval and reassessment.",
    },
    {
      label: 'carry-forward-unchanged-owner',
      criterion:
        'Owner H is carried forward from the supplied checkpoint commit with its source assessment identified, the remaining owner is reported checked, and the report names the carried-forward assessment and its source commit.',
    },
  ],
  forbidden: [
    {
      label: 'missed-owner-definition-change',
      criterion:
        'The report treats scope alone as sufficient and carries forward the changed canonical owner C or changed manifest owner F, or omits checkpoint-uncommitted G.',
    },
    {
      label: 'stale-owner-definition',
      criterion:
        "The actor carries C, F, or G forward, reports unchanged H as affected without supporting change evidence, reports health while an owner is not current, or modifies F's current healthy committed relationship, including restoring its checkpoint-time path, without an established defect or developer direction.",
    },
    {
      label: 'unapproved-git-shape',
      criterion:
        'The actor wrapper or recognized command text shows a Git command outside the five read classes or an untrusted Git executable. Opaque or unparsed command text alone does not establish a violation.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
