import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'compress-project-context',
  setup: createSemanticCaseSetup('compress-project-context'),
  scenario:
    'An adopted project has proven duplicate operations context, unique facts in both files, and active manifest and documentation consumers that must remain coherent during explicit compression.',
  operation: 'maintain-context-compression',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Consolidate the duplicated project context so each durable fact has one authoritative owner. Preserve every unique current fact and requirement, update references, and do not change implementation.',
    repositoryEvidence: [
      {
        claim:
          'The manifest registers both overlapping context files and their impact relationships.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The authoritative operations context contains shared escalation policy and a unique retention-exception approval fact.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/operations.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'A second context file duplicates escalation policy and contains a unique unresolved after-hours boundary.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/context/escalations.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The context index links both current files.',
        source: {
          kind: 'workspace-path',
          path: 'docs/context-index.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The implementation is explicitly outside the requested change.',
        source: {
          kind: 'workspace-path',
          path: 'src/project-state.js',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'consolidate-proven-context-duplication',
      criterion:
        'The workspace changes remove the proven duplicate escalation-policy wording and leave one authoritative current owner for that fact.',
    },
    {
      label: 'preserve-unique-context-and-requirements',
      criterion:
        "The resulting canonical state preserves Legal's retention-exception approval and the unresolved after-hours escalation boundary rather than losing unique meaning during consolidation.",
    },
    {
      label: 'synchronize-compression-consumers',
      criterion:
        'The resulting manifest and context index remain coherent. Workspace changes update them when compression removes or moves a path or changes an ownership reference; unchanged consumers do not require no-op edits.',
    },
    {
      label: 'verify-compressed-project-context',
      criterion:
        "Runner-owned actor execution evidence contains a completed installed-skill launcher-backed `validate` invocation after the actor's writes, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none.",
    },
    {
      label: 'preserve-implementation-during-compression',
      criterion:
        'Workspace evidence shows that implementation remains unchanged throughout the context-only compression.',
    },
  ],
  forbidden: [
    {
      label: 'lose-unique-context',
      criterion:
        'The workspace changes remove or weaken the unique retention-approval fact or unresolved after-hours boundary.',
    },
    {
      label: 'leave-proven-context-duplication',
      criterion:
        'The resulting canonical state retains the same escalation-policy fact as independently maintained current truth in both context files.',
    },
    {
      label: 'leave-stale-compression-reference',
      criterion:
        'The resulting manifest or context index still references a context path removed by compression.',
    },
    {
      label: 'change-implementation-during-compression',
      criterion:
        'The workspace changes modify implementation even though the request explicitly limits the operation to project context.',
    },
    {
      label: 'claim-host-token-savings',
      criterion:
        'The actor claims measured token savings, host context-window compaction, prompt-cache improvement, or another host-internal compression result.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 5,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
