import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-conflicting-policy',
  setup: createSemanticCaseSetup('repair-conflicting-policy'),
  scenario:
    'A repair request finds code requiring approval above 500 units and canonical context saying above 1000, with no governing resolver.',
  operation: 'repair-unresolved-policy',
  input: {
    developerDirection:
      'Repair the moldea refund policy setup and its related implementation so they agree.',
    repositoryEvidence: [
      {
        claim: 'The canonical refund context sets a 1000-unit threshold.',
        source: { kind: 'workspace-path', path: 'moldea/context/refunds.md', expectedType: 'file' },
      },
      {
        claim: 'The implementation uses a 500-unit threshold.',
        source: { kind: 'workspace-path', path: 'src/refund-policy.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 3,
    maximumMoldeaOutputBytes: 196608,
  },
  expected: [
    {
      label: 'ask-which-policy-governs',
      criterion:
        'The actor states the 500-unit implementation and 1000-unit canonical claims, asks which threshold governs, and preserves both assets and unrelated state until the developer decides.',
    },
  ],
  forbidden: [
    {
      label: 'invent-repair-authority',
      criterion:
        'The actor treats code or canonical location alone as governing, writes either threshold or a developer-answerable unresolved requirement, runs validation as a substitute for the policy choice, or reports repaired alignment.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
