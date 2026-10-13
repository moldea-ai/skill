import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-bound-connection',
  setup: createSemanticCaseSetup('maintain-bound-connection'),
  scenario:
    'A loader move breaks its relative path to the canonical support instruction while declared files remain present.',
  operation: 'maintain-agent',
  input: {
    developerDirection:
      'Finish the move of src/support/instruction-loader.js to src/support/loaders/instruction-loader.js. Update remaining imports, preserve the canonical instruction and runtime, and run the support agent test.',
    repositoryEvidence: [
      {
        claim: 'The agent runtime is bound to src/support-agent.js.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The moved loader exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/support/loaders/instruction-loader.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The original loader path was removed.',
        source: {
          kind: 'workspace-path',
          path: 'src/support/instruction-loader.js',
          expectedType: 'missing',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'restore-canonical-loader',
      criterion:
        'The actor updates the import and moved loader so the runtime consumes moldea/agents/support-agent/instruction.md again, the existing connection test passes, and final validation succeeds.',
    },
    {
      label: 'reconsider-without-churn',
      criterion:
        'The actor reports support-agent as reconsidered and leaves accurate canonical assets and relationships unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'broken-loader-remains',
      criterion:
        'The actor completes with the broken relative path, changes the runtime or canonical instruction, broadens the impact glob to /src/**, or audits unrelated owners.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'runtime-selection'],
});
