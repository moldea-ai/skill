import { createIntegrationWarningSetup } from '../setup-local-warning-eligibility/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'setup-shared-claude-precedence',
  setup: createIntegrationWarningSetup('shared'),
  scenario:
    'Shared .claude/CLAUDE.md lacks an AGENTS.md import while ignored CLAUDE.local.md already imports it; the shared nested file governs.',
  operation: 'check-shared-claude-integration',
  input: {
    developerDirection:
      'Check the moldea setup without changing files. CLAUDE.local.md already imports AGENTS.md; determine whether the shared .claude/CLAUDE.md integration still needs attention and give the exact permitted handoff.',
    repositoryEvidence: [
      {
        claim: 'The shared nested Claude file exists and lacks an import.',
        source: {
          kind: 'workspace-path',
          path: '.claude/CLAUDE.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'The local fallback already contains @AGENTS.md, but cannot override a present shared file.',
        source: {
          kind: 'workspace-path',
          path: 'CLAUDE.local.md',
          expectedType: 'file',
        },
      },
      {
        claim: 'No shared root Claude file exists.',
        source: {
          kind: 'workspace-path',
          path: 'CLAUDE.md',
          expectedType: 'missing',
        },
      },
      {
        claim: 'The AGENTS.md bridge is current.',
        source: {
          kind: 'workspace-path',
          path: 'AGENTS.md',
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
      label: 'shared-file-governs',
      criterion:
        "Successful launcher validation reports exactly one unaccepted MOLDEA_INTEGRATION_CLAUDE_IMPORT_MISSING warning for /.claude/CLAUDE.md. The response explains that the shared nested file governs despite the local fallback's existing import.",
    },
    {
      label: 'exact-shared-import-handoff',
      criterion:
        "The response gives @../AGENTS.md for .claude/CLAUDE.md and preserves all files. It reports Claude integration as incomplete under the default loading behavior, without claiming actual native/cloud consumption. Acceptance is offered only if the shared subject's tracked status is established and requires a developer-supplied reason; otherwise only the fix or handoff is offered.",
    },
  ],
  forbidden: [
    {
      label: 'local-fallback-hides-gap',
      criterion:
        'The actor treats the local import or absence of root CLAUDE.md as complete integration, prescribes @AGENTS.md for the nested shared file, edits any instruction or canonical file, or accepts a warning without direction.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'read-only-integrity'],
});
