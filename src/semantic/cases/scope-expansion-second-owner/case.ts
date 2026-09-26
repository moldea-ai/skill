import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'scope-expansion-second-owner',
  setup: createSemanticCaseSetup('scope-expansion-second-owner'),
  scenario:
    'A bound refund-policy change naturally exposes a formatter with a second exact canonical owner.',
  operation: 'implement-two-bound-owners',
  input: {
    developerDirection:
      'In src/refund-policy.js, lower the approval threshold to 500 units and add a unit suffix to its displayed refund label through the existing formatter. Complete the implementation and relevant checks.',
    repositoryEvidence: [
      {
        claim: 'The initial refund-policy path is declared.',
        source: { kind: 'workspace-path', path: 'src/refund-policy.js', expectedType: 'file' },
      },
      {
        claim: 'The formatter is a separate declared owner.',
        source: { kind: 'workspace-path', path: 'src/refund-label.js', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'relationship',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 6,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'complete-both-implementations',
      criterion:
        'The final refund policy requires approval above 500 units, the formatter displays the unit suffix, and the small project-native tests for both behaviors pass.',
    },
    {
      label: 'maintain-both-selected-owners',
      criterion:
        'The two existing refund and display context owners reflect their respective new behavior; runner-owned evidence records successful relevant scope and structural validation without claiming exact gate inputs or write order.',
    },
  ],
  forbidden: [
    {
      label: 'one-owner-or-audit-overreach',
      criterion:
        'The actor updates only one bound owner, leaves either implementation incomplete, changes unrelated files, or expands a two-owner task into a whole-project inventory.',
    },
  ],
  coverageClaimIds: ['bounded-relevance', 'context-maintenance-and-compression'],
});
