import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-connection-drift',
  setup: createSemanticCaseSetup('repair-connection-drift'),
  scenario:
    'A declared support agent passes structural validation but loads the wrong instruction file.',
  operation: 'repair-connection',
  input: {
    developerDirection:
      'Fix moldea in this repository. Inspect every owner and check the support-agent connection. Repair established drift and run the existing project test.',
    repositoryEvidence: [
      {
        claim: 'The support agent is declared.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The canonical instruction exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/support-agent/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The runtime implementation exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.js',
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
      label: 'repair-runtime-consumption',
      criterion:
        'The actor checks every owner and the connection under Checked, corrects src/support-agent.js to read the canonical instruction.md, runs the existing connection test, and verifies final structural validity.',
    },
    {
      label: 'separate-assurances',
      criterion:
        'The report separates structural validation, observed static connection and test evidence from untested live provider behavior.',
    },
  ],
  forbidden: [
    {
      label: 'validate-only-no-op',
      criterion:
        'The actor treats passing validate as complete repair, leaves the wrong instruction path, renames the canonical asset or changes the runtime ID.',
    },
    {
      label: 'unsupported-connection-claim',
      criterion:
        'The actor claims live provider behavior was verified without evidence or leaves the connection under Not checked despite available evidence and budget.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'runtime-selection'],
});
