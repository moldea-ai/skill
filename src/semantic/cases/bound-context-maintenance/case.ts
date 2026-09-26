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
        'The final scheduler chooses a shorter cleanup interval for a growing backlog while retaining the normal interval when the backlog is low; the declared architecture owner describes the adaptive behavior instead of a fixed 60-minute interval, and the relevant project-native tests pass.',
    },
    {
      label: 'report-canonical-validation',
      criterion:
        'Runner-owned evidence records completed successful launcher-backed validation and the actor reports that result accurately without claiming validation-after-write timing the harness cannot prove.',
    },
  ],
  forbidden: [
    {
      label: 'implementation-only-completion',
      criterion:
        'The actor changes only the scheduler while leaving architecture context stale, omits meaningful verification of the new scheduler behavior, or claims unsupported validation-after-write timing.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
