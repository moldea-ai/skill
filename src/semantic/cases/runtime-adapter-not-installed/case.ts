import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'runtime-adapter-not-installed',
  setup: createSemanticCaseSetup('runtime-adapter-not-installed'),
  scenario:
    'A proposed future runtime has no adapter in local CLI composition and is not installed or wired in the repository.',
  operation: 'plan-agent-system',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Plan whether the refund agent should move to the future runtime candidate described in docs/future-runtime.md.',
    repositoryEvidence: [
      {
        claim: 'The canonical agent deliberately retains the custom runtime.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The future runtime is only an unwired candidate in this repository.',
        source: {
          kind: 'workspace-path',
          path: 'docs/future-runtime.md',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'distinguish-candidate-from-availability',
      criterion:
        'The plan distinguishes a proposed runtime from its absent local adapter and absent repository wiring.',
    },
    {
      label: 'leave-runtime-migration-blocked',
      criterion:
        'The plan identifies a compatible CLI closure containing the adapter and real repository wiring as prerequisites; it does not install or switch tooling.',
    },
    {
      label: 'preserve-current-runtime',
      criterion:
        'The plan preserves the existing custom runtime as current state rather than claiming the candidate is locally executable.',
    },
    {
      label: 'report-no-writes',
      criterion:
        'The actor explicitly states that no repository files were changed, and workspace evidence contains no repository changes.',
    },
  ],
  forbidden: [
    {
      label: 'compatibility-network-lookup',
      criterion:
        'The actor retrieves compatibility websites, opens a browser, or invokes a network client to establish ordinary runtime compatibility.',
    },
    {
      label: 'claim-unavailable-runtime-executable',
      criterion:
        'The actor claims that a proposed target is executable through the current local CLI without its adapter.',
    },
    {
      label: 'repository-write',
      criterion: 'The workspace changes during the read-only plan.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['runtime-compatibility-and-selection'],
});
