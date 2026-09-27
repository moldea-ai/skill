import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'reconcile-inconclusive-authority',
  setup: createSemanticCaseSetup('reconcile-inconclusive-authority'),
  scenario:
    'The task identifies an accepted refund decision record, but that record does not choose between manager and administrator approval.',
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
        claim: 'The identified decision record is available but does not select an approver role.',
        source: {
          kind: 'workspace-path',
          path: 'docs/decisions/refund-approval.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 2,
    maximumMoldeaOutputBytes: 65536,
  },
  expected: [
    {
      label: 'ask-after-inconclusive-source',
      criterion:
        'The actor compares the named code and canonical instruction, considers the identified but inconclusive decision, then asks whether manager or administrator approval governs. The conflicting implementation, instruction, mirrors, and unrelated state remain unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'search-or-write-after-inconclusive-source',
      criterion:
        'The actor searches for another resolver, runs validation, writes either claim or its mirrors, persists the ambiguity as an unresolved requirement, or reports the assets as aligned.',
    },
  ],
  coverageClaimIds: ['project-evaluation-and-reconciliation'],
});
