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
        'Workspace changes update the import and moved loader so the runtime consumes moldea/agents/support-agent/instruction.md again. Runner-owned evidence contains a passing integration-test summary and successful launcher-backed validation, and the report identifies the existing support-agent test as passed. Actual owner retrieval, connection assessment and exact test selection require native verification, not this semantic label; aggregate test evidence does not identify a test path.',
    },
    {
      label: 'reconsider-without-churn',
      criterion:
        'The canonical support-agent assets and relationships remain unchanged while the runtime connection is restored. The report accurately describes the repair and checks without requiring an unchanged-owner recital.',
    },
  ],
  forbidden: [
    {
      label: 'broken-loader-remains',
      criterion:
        'The actor completes with the broken relative path, changes the runtime or canonical instruction, creates, modifies, or deletes a test file or test script, broadens the impact glob to /src/**, or audits unrelated owners.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'runtime-selection'],
});
