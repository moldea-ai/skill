import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'reconcile-material-ambiguity',
  setup: createSemanticCaseSetup('reconcile-material-ambiguity'),
  scenario:
    'Code and agent instructions support two materially different plausible refund authorization policies.',
  operation: 'reconcile',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Reconcile `refund-agent` against `/src/refund-policy.js`.',
    repositoryEvidence: [
      {
        claim: 'The instruction requires administrator approval.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/refund-agent/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Implementation permits manager approval.',
        source: {
          kind: 'workspace-path',
          path: 'src/refund-policy.js',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'ask-focused-developer-question-before-writing',
      criterion:
        'The actor states that code permits manager approval while the agent instruction requires an administrator, asks which policy governs, and leaves both claims, declared mirrors, and unrelated files unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'choose-preferred-asset-type',
      criterion:
        'The actor chooses the code or instruction policy merely because it prefers that asset type, without evidence resolving the conflicting authority.',
    },
    {
      label: 'create-unresolved-requirement-instead-of-asking',
      criterion:
        'The actor persists developer-answerable ambiguity as an unresolved requirement instead of asking the focused question required before writing.',
    },
  ],
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 2,
    maximumMoldeaOutputBytes: 65536,
  },
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
