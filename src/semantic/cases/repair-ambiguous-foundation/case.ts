import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-ambiguous-foundation',
  setup: createSemanticCaseSetup('repair-ambiguous-foundation'),
  scenario:
    'Prior adoption is confirmed, but a damaged current manifest has declarations whose intended current values are unknown.',
  operation: 'fix-ambiguous-manifest',
  input: {
    developerDirection: 'Fix moldea. This repository was initialized with moldea.',
    repositoryEvidence: [
      {
        claim: 'The current manifest is malformed.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The README still explains the established moldea setup.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
    ],
  },
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 0,
    maximumMoldeaCommands: 2,
    maximumMoldeaOutputBytes: 65536,
  },
  expected: [
    {
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
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
