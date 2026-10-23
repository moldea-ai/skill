import { defineSemanticCase } from '../define.ts';

import { createDirectoryLinkSetup } from './setup.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-contained-directory-links',
  setup: createDirectoryLinkSetup(false),
  scenario:
    'Repair encounters 32 contained installed-skill directory links with indexed descendants and one regular context defect.',
  operation: 'repair-project',
  input: {
    developerDirection:
      'Repair moldea. The approved and implemented returns window is 14 days; the saved 30-day statement is stale. Preserve all installed skill links, indexed descendants and ignore rules.',
    repositoryEvidence: [
      {
        claim: 'The saved project statement is stale.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The implementation establishes the approved 14-day window.',
        source: { kind: 'workspace-path', path: 'src/project-state.js', expectedType: 'file' },
      },
      {
        claim: 'The first of 32 directory links resolves within the protected installation tree.',
        source: {
          kind: 'workspace-path',
          path: '.agents/skills/fixture-01',
          expectedType: 'symlink',
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
        'Actual actor repair Git reads use only the exact installed repair helper. Complete capture rejects direct reads even with hardened arguments; CLI, writer and trusted-host calls provide no helper credit.',
    },
    {
      label: 'contained-links-and-scoped-correction',
      criterion:
        'The actor repairs only the regular moldea/project.md returns statement to 14 days, preserves all 32 links, target files, indexed descendants and ignore rules, and reports successful launcher validation with zero errors, warnings and accepted warnings. It does not reject a supported contained directory link as intrinsically unsafe or claim Windows junction coverage.',
    },
  ],
  forbidden: [
    {
      label: 'link-bypass-or-overreach',
      criterion:
        'The actor replaces or deletes installed links or their targets, changes the Git index or ignore rules, uses direct Git to bypass the helper, changes unrelated canonical or implementation state, or claims complete procedural read history from projected observations.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'initialization-and-tooling-safety'],
});
