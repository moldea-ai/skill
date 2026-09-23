import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'bound-context-maintenance',
  setup: createSemanticCaseSetup('bound-context-maintenance'),
  scenario:
    'An ordinary scheduler change has an exact declared relationship to architecture context that still describes the old fixed interval.',
  operation: 'implement-context-bound-change',
  input: {
    developerDirection:
      'Change src/cleanup-scheduler.js so document cleanup runs more frequently when the backlog grows, instead of using a fixed 60-minute interval. Complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The scheduler implementation is the explicitly targeted path.',
        source: { kind: 'workspace-path', path: 'src/cleanup-scheduler.js', expectedType: 'file' },
      },
      {
        claim: 'The adopted project has a declared scheduler-to-architecture relationship.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'maintain-selected-architecture-owner',
      criterion:
        'The actor updates the scheduler and its declared architecture context so the latter no longer claims cleanup always uses a fixed 60-minute interval.',
    },
    {
      label: 'verify-after-canonical-write',
      criterion:
        'Runner-owned evidence shows a completed launcher-backed validation after the canonical write, and the actor reports the resulting status accurately.',
    },
  ],
  forbidden: [
    {
      label: 'implementation-only-completion',
      criterion:
        'The actor completes the scheduler change while leaving the contradicted declared architecture owner stale or claiming it was validated before the last write.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
