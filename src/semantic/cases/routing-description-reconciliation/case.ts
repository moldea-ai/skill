import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'routing-description-reconciliation',
  setup: createSemanticCaseSetup('routing-description-reconciliation'),
  scenario:
    'A closed registration and its focused test use the canonical instruction body as routing metadata instead of the agent description.',
  operation: 'fix-routing-description',
  input: {
    developerDirection:
      'Fix moldea for the triage agent. The routing registration and its focused test must use the canonical description.md. Preserve the canonical instruction and description.',
    repositoryEvidence: [
      {
        claim: 'The routing document requires routing-facing metadata.',
        source: {
          kind: 'workspace-path',
          path: 'docs/routing.md',
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
        'The actor response or final changes identify the original routing-facing metadata mapping to the instruction body as the problem being corrected.',
    },
    {
      label: 'use-canonical-routing-description',
      criterion:
        'The workspace changes update routing registration to consume the canonical description.md.',
    },
    {
      label: 'update-focused-routing-test',
      criterion:
        'The workspace changes update focused routing test to the evidence-backed resulting state.',
    },
    {
      label: 'rerun-deterministic-inspection',
      criterion:
        'Runner-owned actor execution evidence contains a completed bundled CLI `validate` invocation, with a compatible exit code, status, and result fact. A `valid` result proves structural validity. A compatible `invalid` result also satisfies this evaluation criterion when the actor accurately reports the invalid status and material safe diagnostics without claiming readiness. The actor response states the resulting status and material diagnostics, including their absence when none; it need not repeat the literal invocation.',
    },
  ],
  forbidden: [
    {
      label: 'change-canonical-agent-text',
      criterion: 'The workspace changes alter the supplied canonical description or instruction.',
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
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  coverageClaimIds: ['routing-description-ownership'],
});
