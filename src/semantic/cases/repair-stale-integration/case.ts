import { defineSemanticCase } from '../define.ts';

import { createStaleIntegrationSetup } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-stale-integration',
  setup: createStaleIntegrationSetup(false),
  scenario:
    'A frozen 10.0.1 managed bridge is stale beside the immutable 10.0.2 installation, behind a contained AGENTS.md link with unrelated BOM/CRLF instructions.',
  operation: 'repair-setup-integration',
  input: {
    developerDirection:
      'Repair moldea, including the stale managed AGENTS.md integration. Preserve its link to config/agent-notes.md, every byte outside the managed region and unrelated files.',
    followUpDeveloperRequests: [
      'Repair moldea again. Preserve the healthy integration and existing AGENTS.md link; make no unnecessary changes.',
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
          'The target contains the frozen 10.0.1 bridge from commit 5e87645bd2830dde0f93914e285309728d456a8b, surrounded by BOM/CRLF host rules.',
        source: {
          kind: 'workspace-path',
          path: 'config/agent-notes.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The installed writer embeds the current 10.0.2 bridge.',
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
        'Observed actor repair Git reads stay inside the exact installed repair helper; direct reads fail even with hardened arguments. Approved installed CLI and managed-writer calls and trusted-host calls supply no positive comparison credit. Complete capture must contain no disallowed actor form. Conservative no-Git reassessment may pass without comparison when unnecessary.',
    },
    {
      label: 'refresh-only-owned-region',
      criterion:
        'The first cycle refreshes the managed region through the installed writer, preserves AGENTS.md as the same relative link and preserves target bytes outside the region including BOM and CRLF line endings. Only config/agent-notes.md changes; canonical state, source and ignore rules remain intact.',
    },
    {
      label: 'validate-and-repeat-noop',
      criterion:
        'Both cycles have successful launcher-backed validation with zero errors, warnings and accepted warnings. The second cycle reports the unchanged healthy integration and has no workspace changes. Recorded envelopes and final state do not establish the relative timing of writes and validation; native traces cover that ordering.',
    },
  ],
  forbidden: [
    {
      label: 'integration-migration-overreach',
      criterion:
        'The actor replaces the AGENTS.md link, rewrites outside-region rules or line endings, changes the installed skill, adds an installation-time migration or warning acceptance, changes unrelated files, or claims structural validation proves native host instruction consumption.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'initialization-and-tooling-safety'],
});
