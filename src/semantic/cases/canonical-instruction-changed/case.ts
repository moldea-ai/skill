import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'canonical-instruction-changed',
  setup: createSemanticCaseSetup('canonical-instruction-changed'),
  scenario:
    'An authorized instruction change affects one canonical agent instruction with two declared exact mirrors.',
  operation: 'maintain-agent',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Escalate refunds to an administrator after two failed processing attempts.',
    repositoryEvidence: [
      {
        claim: 'One canonical instruction has two declared mirrors.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The canonical instruction contains the current retry threshold.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/refund-agent/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The developer authorizes a new retry threshold.',
        source: {
          kind: 'developer-direction',
        },
      },
    ],
  },
  expected: [
    {
      label: 'synchronize-every-declared-mirror',
      criterion:
        'The workspace changes update the canonical instruction as the authority, then derive and synchronize every declared exact mirror from that changed canonical content in the same coherent operation.',
    },
  ],
  forbidden: [
    {
      label: 'independent-mirror-edit',
      criterion:
        'The actor edits either declared exact mirror as an independent authority instead of deriving both mirrors from the changed canonical instruction.',
    },
    {
      label: 'leave-stale-mirror',
      criterion:
        'The workspace changes leave stale mirror after the operation should have reconciled it.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
