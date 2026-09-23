import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-reconciliation',
  setup: createSemanticCaseSetup('routing-description-reconciliation'),
  scenario:
    'A supported closed custom-runtime registration and its focused test still map routing-facing metadata to the agent description even though the target now has a valid dedicated handoff description.',
  operation: 'reconcile-routing-description',
  input: {
    developerDirection:
      'Use moldea to complete this repository task. Reconcile the routing-description mapping with the canonical target metadata.',
    repositoryEvidence: [
      {
        claim: 'Runtime guidance requires routing-facing metadata.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/runtimes/custom.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Implementation consumes the wrong canonical source.',
        source: {
          kind: 'workspace-path',
          path: 'src/triage-agent.mjs',
          expectedType: 'file',
        },
      },
      {
        claim: 'A focused test preserves the stale mapping.',
        source: {
          kind: 'workspace-path',
          path: 'src/triage-agent.test-integration.mjs',
          expectedType: 'file',
        },
      },
    ],
  },
  expected: [
    {
      label: 'confirm-semantic-routing-problem',
      criterion:
        'The actor establishes from the runtime guidance and closed registration that routing-facing metadata incorrectly consumes the general agent description.',
    },
    {
      label: 'update-runtime-registration-to-handoff-description',
      criterion:
        'The workspace changes update runtime registration to handoff description to the evidence-backed resulting state.',
    },
    {
      label: 'update-focused-routing-test',
      criterion:
        'The workspace changes update focused routing test to the evidence-backed resulting state.',
    },
    {
      label: 'rerun-deterministic-inspection',
      criterion:
        "Runner-owned actor execution evidence contains a completed installed-skill launcher-backed `validate` invocation after the actor's writes, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none; it need not repeat the literal invocation.",
    },
  ],
  forbidden: [
    {
      label: 'change-general-agent-description',
      criterion:
        'The workspace changes alter general agent description even though the established contract requires preserving it.',
    },
    {
      label: 'leave-stale-routing-test',
      criterion:
        'The workspace changes leave stale routing test after the operation should have reconciled it.',
    },
    {
      label: 'create-parallel-routing-path',
      criterion:
        'The workspace changes create parallel routing path even though this scenario does not authorize or support it.',
    },
  ],
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  coverageClaimIds: ['routing-description-ownership'],
});
