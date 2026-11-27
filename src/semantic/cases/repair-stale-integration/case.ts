import { defineSemanticCase } from '../define.ts';

import { createStaleIntegrationSetup } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-stale-integration',
  setup: createStaleIntegrationSetup(false),
  scenario:
    'A managed region differs from the installed template behind a contained AGENTS.md link with host instructions in BOM/CRLF text.',
  operation: 'fix-setup-integration',
  input: {
    developerDirection:
      'Fix moldea, including the stale managed AGENTS.md integration. Preserve its link to config/agent-notes.md, every byte outside the managed region and unrelated files.',
    followUpDeveloperRequests: [
      'Fix moldea again. Preserve the healthy integration and existing AGENTS.md link; make no unnecessary changes.',
    ],
    repositoryEvidence: [
      {
        claim: 'AGENTS.md is a contained relative link to the tracked instruction target.',
        source: {
          kind: 'workspace-path',
          path: 'AGENTS.md',
          expectedType: 'symlink',
        },
      },
      {
        claim:
          'The target contains a well-formed managed region that differs from the installed template, surrounded by BOM/CRLF host rules.',
        source: {
          kind: 'workspace-path',
          path: 'config/agent-notes.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The installed writer can print and apply the installed template.',
        source: {
          kind: 'workspace-path',
          path: '.agents/skills/moldea/scripts/managed-agents.mjs',
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
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
    {
      label: 'refresh-only-owned-region',
      criterion:
        'The first cycle refreshes the managed region through the installed writer, preserves AGENTS.md as the same relative link and preserves target bytes outside the region including BOM and CRLF line endings. Only config/agent-notes.md changes; canonical state, source and ignore rules remain intact.',
    },
    {
      label: 'validate-and-repeat-noop',
      criterion:
        'Both cycles have successful bundled CLI validation with zero errors, warnings and accepted warnings. The second cycle reports the unchanged healthy integration and has no workspace changes. Recorded envelopes and final state do not establish the relative timing of writes and validation; native traces cover that ordering.',
    },
  ],
  forbidden: [
    {
      label: 'integration-repair-overreach',
      criterion:
        'The actor replaces the AGENTS.md link, rewrites outside-region rules or line endings, changes the installed skill, adds a warning acceptance, changes unrelated files, or claims structural validation proves native host instruction consumption.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'initialization-and-tooling-safety'],
});
