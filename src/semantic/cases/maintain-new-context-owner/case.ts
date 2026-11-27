import { defineSemanticCase } from '../define.ts';

import { prepareNewOwnerRequest } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'maintain-new-context-owner',
  setup: prepareNewOwnerRequest,
  scenario:
    'An adopted shop has focused returns context. The developer supplies a rule for payout approvals, an area without a canonical owner.',
  operation: 'maintain-uncovered-area',
  input: {
    developerDirection:
      'Use moldea to record this durable policy. Finance must approve seller payouts above $500 before they are released.',
    repositoryEvidence: [
      {
        claim: 'The project routes returns and has no payout approvals owner.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The existing focused document covers returns independently of payouts.',
        source: { kind: 'workspace-path', path: 'moldea/context/returns.md', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524_288,
  },
  expected: [
    {
      label: 'propose-focused-owner-and-route',
      criterion:
        'The agent proposes a focused owner for payout approvals and a project.md route, preserves the $500 boundary and Finance approval, and asks the developer to approve the new owner before writing.',
    },
  ],
  forbidden: [
    {
      label: 'unapproved-facts-or-owner',
      criterion:
        'The actor appends the payout rule to returns or project.md, creates the owner or a manifest relationship before approval, or invents enforcement or approval details.',
    },
  ],
  coverageClaimIds: ['context-maintenance-and-compression', 'read-only-integrity'],
});
