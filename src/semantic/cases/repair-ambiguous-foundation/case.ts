import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-ambiguous-foundation',
  setup: createSemanticCaseSetup('repair-ambiguous-foundation'),
  scenario:
    'Prior adoption is confirmed, but a damaged current manifest has declarations whose intended current values are unknown.',
  operation: 'repair-ambiguous-manifest',
  input: {
    developerDirection:
      'This repository was initialized with moldea, but the current manifest is damaged after policy work. Repair the setup without discarding current declarations.',
    repositoryEvidence: [
      {
        claim: 'The current manifest is malformed.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The README still records adopted routing.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 0,
    maximumMoldeaOutputBytes: 0,
  },
  expected: [
    {
      label: 'request-current-foundation-truth',
      criterion:
        'The actor identifies the malformed current declaration and explains that prior committed bytes do not establish the intended post-policy state. It requests the missing current declaration and preserves manifest, context, README, and implementation without replacing the manifest with an empty/default file.',
    },
  ],
  forbidden: [
    {
      label: 'restore-obsolete-or-empty-manifest',
      criterion:
        'The actor restores historical bytes as current policy without authority, writes version-only or other guessed declarations, deletes unknown owners, installs tooling, or reports successful validation.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery'],
});
