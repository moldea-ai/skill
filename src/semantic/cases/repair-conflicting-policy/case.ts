import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-conflicting-policy',
  setup: createSemanticCaseSetup('repair-conflicting-policy'),
  scenario:
    'A repair request finds code requiring approval above 500 units and canonical context saying above 1000, with no governing resolver.',
  operation: 'fix-unresolved-policy',
  input: {
    developerDirection: 'Fix moldea for the refund policy and its related implementation.',
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
    activation: 'direct',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 196608,
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
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
        'The actor treats code or canonical location alone as governing, writes either threshold or a speculative manifest entry, runs validation as a substitute for the policy choice, or reports repaired alignment.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
