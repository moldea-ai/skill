import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'reconcile-identified-authority',
  setup: createSemanticCaseSetup('reconcile-identified-authority'),
  scenario:
    'Code permits manager approval, the agent requires an administrator, and the task identifies an accepted decision that settles the conflict.',
  operation: 'reconcile',
  input: {
    developerDirection:
      'Reconcile `refund-agent` against `/src/refund-policy.js`. The accepted governing decision for refund approval is `docs/decisions/refund-approval.md`.',
    repositoryEvidence: [
      {
        claim: 'The developer identifies the decision record as governing this dispute.',
        source: { kind: 'developer-direction' },
      },
      {
        claim: 'The agent instruction requires administrator approval.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/agents/refund-agent/instruction.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Implementation permits manager approval.',
        source: { kind: 'workspace-path', path: 'src/refund-policy.js', expectedType: 'file' },
      },
      {
        claim: 'The identified decision record is available in the repository.',
        source: {
          kind: 'workspace-path',
          path: 'docs/decisions/refund-approval.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 2,
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'resolve-from-identified-decision',
      criterion:
        'After comparing the named code and one canonical instruction body, the actor reads only the task-identified governing decision and uses its explicit manager-approval rule to settle the conflict.',
    },
    {
      label: 'correct-and-verify-coherent-scope',
      criterion:
        'The actor aligns the canonical refund instruction and its declared mirrors with the manager-approval decision, preserves the matching implementation, and completes launcher-backed validation after the writes.',
    },
  ],
  forbidden: [
    {
      label: 'authority-search-or-unresolved-stop',
      criterion:
        'The actor searches for another authority, treats code or canonical location as authoritative by itself, asks the developer to repeat the settled decision, or leaves the conflicting instruction and mirrors unchanged.',
    },
  ],
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
