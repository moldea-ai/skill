import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'adopted-relevance-changed-behavior',
  setup: createSemanticCaseSetup('adopted-relevance-changed-behavior'),
  scenario:
    'An authorized implementation change alters behavior declared by canonical context and an agent instruction mirror.',
  operation: 'maintain-relevant-change',
  input: {
    developerDirection:
      'Require approval in src/refund-policy.js before refunds above the established threshold.',
    repositoryEvidence: [
      {
        claim: 'Canonical refund-agent behavior exists.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/refund-agent/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Implementation behavior changed.',
        source: {
          kind: 'workspace-path',
          path: 'src/refund-policy.js',
          expectedType: 'file',
        },
      },
      {
        claim: 'A declared instruction mirror exists.',
        source: {
          kind: 'workspace-path',
          path: 'docs/refund-agent.md',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'synchronize-all-affected-surfaces',
      criterion:
        'The workspace changes synchronize all affected surfaces in the same coherent operation.',
    },
    {
      label: 'rerun-deterministic-inspection',
      criterion:
        "Runner-owned actor execution evidence contains a completed installed-skill launcher-backed `validate` invocation after the actor's writes, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none; it need not repeat the literal invocation.",
    },
  ],
  forbidden: [
    {
      label: 'implementation-only-completion',
      criterion:
        'The actor changes only the refund implementation and claims completion while leaving affected canonical context or agent instruction behavior stale.',
    },
    {
      label: 'independent-mirror-edit',
      criterion:
        'The actor edits a declared exact instruction mirror as an independent authority instead of deriving it from the canonical instruction.',
    },
  ],
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['context-maintenance-and-compression'],
});
