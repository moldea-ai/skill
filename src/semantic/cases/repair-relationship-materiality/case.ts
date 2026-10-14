import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-relationship-materiality',
  setup: createSemanticCaseSetup('repair-relationship-materiality'),
  scenario:
    'Refund policy and settings are material; navigation and tooling do not govern this owner.',
  operation: 'repair',
  input: {
    developerDirection:
      'Fix moldea. Audit the existing refund context and its material implementation relationships. Preserve the established approval and configured-threshold policy and all application files.',
    repositoryEvidence: [
      {
        claim: 'The declared owners exist.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 16,
    maximumMoldeaOutputBytes: 1048576,
    profile: 'largeTraversal',
  },
  expected: [
    {
      label: 'material-relationship-repair',
      criterion:
        'The refunds owner retains /src/refund-policy.js and /src/refund-settings.js because they govern approval and threshold facts, and removes /src/ui/navigation.js, /package.json and /package-lock.json because they govern presentation/tooling outside those owner facts.',
    },
    {
      label: 'verify-minimal-repair',
      criterion:
        'Only the necessary manifest relationships change; owner prose, application, package files and unrelated state stay unchanged. Runner-owned evidence records successful launcher-backed validation and the report separates structural validity from semantic coverage.',
    },
  ],
  forbidden: [
    {
      label: 'categorical-or-presentation-relationship',
      criterion:
        'The actor retains navigation/tooling relationships without owner-specific behavioral evidence, removes the real policy/settings relationships merely because they look like shared code or configuration, or adds a broad source glob.',
    },
    {
      label: 'unrelated-rewrite',
      criterion: 'The actor rewrites accurate context, implementation, dependencies or Git state.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'context-maintenance-and-compression'],
});
