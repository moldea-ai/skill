import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-tool-registration',
  setup: createSemanticCaseSetup('maintain-tool-registration'),
  scenario:
    'A tool-registry refactor accidentally omits a declared tool from the outgoing agent registration.',
  operation: 'maintain-agent',
  input: {
    developerDirection:
      'Finish the src/support/tools/registry.js refactor without changing which tools support-agent registers. Keep the canonical instruction and tool declaration, and run the existing support-agent test.',
    repositoryEvidence: [
      {
        claim: 'Only the tool owns the changed source subtree.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'The refactored registry exists.',
        source: {
          kind: 'workspace-path',
          path: 'src/support/tools/registry.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'The runtime consumes the registry.',
        source: {
          kind: 'workspace-path',
          path: 'src/support-agent.js',
          expectedType: 'file',
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
      label: 'restore-tool-registration',
      criterion:
        'Workspace changes restore the lookupOrder implementation to the outgoing registration in registry.js under the declared tool name lookup_order without changing that tool declaration. Runner-owned evidence contains a passing integration-test summary and successful launcher-backed validation, and the report identifies the existing support-agent test as passed. Actual tool-owner resolution through agentId, connection assessment and exact test selection require native verification, not this semantic label; aggregate test evidence does not identify a test path.',
    },
    {
      label: 'preserve-canonical-tool',
      criterion:
        'The actor reports support-agent as reconsidered without changing its accurate canonical instruction or manifest tool.',
    },
  ],
  forbidden: [
    {
      label: 'missed-tool-connection',
      criterion:
        'The actor leaves lookupOrder unregistered, removes the tool declaration, changes the instruction, creates, modifies, or deletes a test file or test script, or performs a whole-project audit.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'runtime-selection'],
});
