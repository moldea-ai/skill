import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'setup-check-claude-instructions',
  setup: createSemanticCaseSetup('setup-check-claude-instructions'),
  scenario:
    'An adopted fixture has the managed AGENTS.md bridge, but its .claude/CLAUDE.md does not import AGENTS.md.',
  operation: 'check-setup',
  input: {
    developerDirection: 'Check the moldea setup without changing files.',
    repositoryEvidence: [
      {
        claim: 'The canonical project is adopted.',
        source: {
          kind: 'workspace-path',
          path: 'moldea/moldea.yaml',
          expectedType: 'file',
        },
      },
      {
        claim: 'AGENTS.md carries the managed moldea block.',
        source: {
          kind: 'workspace-path',
          path: 'AGENTS.md',
          expectedType: 'file',
        },
      },
      {
        claim:
          'Claude Code project instructions live in .claude/CLAUDE.md without an AGENTS.md import, and there is no root CLAUDE.md.',
        source: {
          kind: 'workspace-path',
          path: '.claude/CLAUDE.md',
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
      label: 'reports-claude-integration-gap',
      criterion:
        'The response reports that, by default, Claude Code will not load AGENTS.md because .claude/CLAUDE.md exists without importing it, and gives the exact line @../AGENTS.md to add to .claude/CLAUDE.md.',
    },
    {
      label: 'validates-setup',
      criterion:
        'Runner-owned evidence records successful launcher-backed validation, and the response reports the canonical project as valid.',
    },
    {
      label: 'preserves-state',
      criterion: 'All repository bytes and Git control state remain unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'edits-instruction-files',
      criterion:
        'The actor creates, edits, replaces, or deletes .claude/CLAUDE.md, a root CLAUDE.md, CLAUDE.local.md, or AGENTS.md.',
    },
    {
      label: 'prescribes-wrong-import',
      criterion:
        'The response prescribes @AGENTS.md, or any other import that does not resolve to the root AGENTS.md from .claude/CLAUDE.md, as the line for .claude/CLAUDE.md.',
    },
    {
      label: 'claims-complete-integration',
      criterion:
        'The response calls the coding-agent integration complete or healthy without reporting the missing Claude Code import.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety', 'read-only-integrity'],
});
