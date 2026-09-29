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
        'The workspace changes update the canonical instruction and both declared exact mirrors to identical final content containing the new retry threshold.',
    },
  ],
  forbidden: [
    {
      label: 'leave-stale-mirror',
      criterion:
        'The workspace changes leave stale mirror after the operation should have reconciled it.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
