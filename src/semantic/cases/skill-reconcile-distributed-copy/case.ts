import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'skill-reconcile-distributed-copy',
  setup: createSemanticCaseSetup('skill-reconcile-distributed-copy'),
  scenario:
    'An authoritative release-review skill supports npm and pnpm while a repository-owned distributed copy remains npm-only, and the developer has confirmed the source should win.',
  operation: 'reconcile-agent-skill',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Reconcile the distributed release-review copy from the authoritative source and verify both artifacts independently.',
    repositoryEvidence: [
      {
        claim: 'The authoritative source supports npm and pnpm.',
        source: {
          kind: 'workspace-path',
          path: 'skills/release-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The repository-owned distributed copy remains npm-only.',
        source: {
          kind: 'workspace-path',
          path: 'dist/skills/release-review/SKILL.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The distribution contract requires an exact textual copy.',
        source: {
          kind: 'workspace-path',
          path: 'docs/skill-distribution.md',
          expectedType: 'file',
        },
      },
    ],
  },
  skillEvidence: {
    activationScenarios: [],
    artifacts: [
      {
        role: 'authoritative-source',
        root: 'skills/release-review',
      },
      {
        role: 'distributed-copy',
        root: 'dist/skills/release-review',
      },
    ],
  },
  expected: [
    {
      label: 'preserve-authoritative-skill-source',
      criterion:
        'The response and workspace changes preserve authoritative skill source throughout the operation.',
    },
    {
      label: 'synchronize-distributed-copy',
      criterion:
        'The workspace changes synchronize distributed copy in the same coherent operation.',
    },
    {
      label: 'verify-source-and-copy-independently',
      criterion:
        'The supplied response and artifacts verify source and copy independently at the closest practical boundary.',
    },
    {
      label: 'report-copy-relationship',
      criterion:
        'The actor response explicitly reports copy relationship, with the supplied workspace evidence remaining consistent with that report.',
    },
  ],
  forbidden: [
    {
      label: 'overwrite-source-from-stale-copy',
      criterion:
        'The workspace changes overwrite source from stale copy from a non-authoritative source.',
    },
    {
      label: 'leave-stale-distributed-copy',
      criterion:
        'The workspace changes leave stale distributed copy after the operation should have reconciled it.',
    },
    {
      label: 'claim-installation-proves-activation',
      criterion:
        'The actor response claims installation proves activation without the evidence or authority required by this scenario.',
    },
    {
      label: 'fabricate-cross-repository-binding',
      criterion:
        'The response or workspace changes fabricate cross repository binding without a qualifying supported artifact.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  coverageClaimIds: ['agent-and-skill-design'],
});
