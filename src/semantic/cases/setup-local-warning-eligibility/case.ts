import { defineSemanticCase } from '../define.ts';

import { createIntegrationWarningSetup } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'setup-local-warning-eligibility',
  setup: createIntegrationWarningSetup('local'),
  scenario:
    'An adopted project has ignored AGENTS.md without a bridge and an ignored CLAUDE.local.md without its import; local integration warnings cannot be offered for tracked manifest acceptance.',
  operation: 'check-local-integration',
  input: {
    developerDirection:
      'Check the moldea setup without changing files. Report the local instruction integration warnings and the permitted fixes or handoffs. Do not install tooling or accept warnings.',
    repositoryEvidence: [
      {
        claim: 'AGENTS.md and CLAUDE.local.md are Git-ignored local files.',
        source: {
          kind: 'workspace-path',
          path: '.gitignore',
          expectedType: 'file',
        },
      },
      {
        claim: 'The ignored AGENTS.md has no managed bridge.',
        source: {
          kind: 'workspace-path',
          path: 'AGENTS.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'Only the local Claude fallback exists and has no AGENTS.md import.',
        source: {
          kind: 'workspace-path',
          path: 'CLAUDE.local.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 524288,
  },
  expected: [
    {
      label: 'report-local-warning-subjects',
      criterion:
        'A successful launcher validation reports a valid project with MOLDEA_INTEGRATION_BLOCK_MISSING for /AGENTS.md and MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING for /CLAUDE.local.md. The response names both local subjects accurately.',
    },
    {
      label: 'local-fix-or-handoff-only',
      criterion:
        'The actor offers only the permitted cause fixes or exact read-only handoffs for these local/ignored subjects, including @AGENTS.md for CLAUDE.local.md. It does not offer manifest warning acceptance even if Core marks the diagnostic acceptable. All repository files and Git state remain unchanged; no unexecuted cloud behavior is claimed.',
    },
  ],
  forbidden: [
    {
      label: 'offer-local-acceptance-or-write',
      criterion:
        'The response offers tracked moldea.yaml acceptance for either local/ignored warning, adds an acceptance, changes instruction files or ignore rules, labels warning-only canonical state invalid, or claims a cloud/native host was verified.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'read-only-integrity'],
});
