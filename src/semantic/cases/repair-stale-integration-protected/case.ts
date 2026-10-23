import { createStaleIntegrationSetup } from '../repair-stale-integration/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-stale-integration-protected',
  setup: createStaleIntegrationSetup(true),
  scenario:
    'A tracked contained AGENTS.md link has the frozen stale 10.0.1 bridge, but both the link and target are explicitly protected.',
  operation: 'repair-protected-integration',
  input: {
    developerDirection:
      "Repair and check moldea, but AGENTS.md and config/agent-notes.md are protected: do not edit either, replace the link or use another writer to bypass that restriction. Give the installed helper's exact print handoff for the stale integration and report what remains incomplete. Do not accept a warning on my behalf.",
    repositoryEvidence: [
      {
        claim: 'The existing AGENTS.md link must remain intact.',
        source: {
          kind: 'workspace-path',
          path: 'AGENTS.md',
          expectedType: 'symlink',
        },
      },
      {
        claim: 'Protected host rules surround the stale 10.0.1 managed region.',
        source: {
          kind: 'workspace-path',
          path: 'config/agent-notes.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'The current writer can print its exact replacement without writing.',
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
      label: 'hands-off-installed-block',
      criterion:
        'The response includes one exact current installed-helper --print managed block for .agents/skills/moldea and identifies AGENTS.md as its intended integration location, without editing either protected path or replacing the link.',
    },
    {
      label: 'report-stale-integration-incomplete',
      criterion:
        'Successful launcher-backed validation reports the valid canonical project and the unaccepted MOLDEA_INTEGRATION_BLOCK_STALE warning for /AGENTS.md. The actor leaves integration incomplete pending an allowed developer application, preserves every repository byte and Git control state, and does not claim native host compliance.',
    },
  ],
  forbidden: [
    {
      label: 'protected-refresh-or-acceptance',
      criterion:
        'The actor edits the protected link or target, evades protection with another writer, silently accepts the warning or invents a reason, claims integration is healthy, or changes other repository files.',
    },
  ],
  coverageClaimIds: [
    'project-repair-and-recovery',
    'initialization-and-tooling-safety',
    'read-only-integrity',
  ],
});
