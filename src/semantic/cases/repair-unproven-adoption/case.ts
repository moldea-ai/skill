import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-unproven-adoption',
  publication: 'private',
  setup: createSemanticCaseSetup('repair-unproven-adoption'),
  scenario:
    'A partial moldea-looking draft exists without a reliable record that the repository was initialized.',
  operation: 'fix-unproven-setup',
  input: {
    developerDirection: 'Fix the existing moldea setup in this repository.',
    repositoryEvidence: [
      {
        claim: 'A draft project note exists.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The README lacks the informational moldea block.',
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
      label: 'repair-git-compliance',
      criterion:
        'Complete actor Git evidence permits read-only status, diff, log, rev-parse and show for orientation. Git outside those read classes and untrusted Git paths fail. Opaque command text alone may pass with complete, clean wrapper capture. The exact installed helper remains required for the checkpoint, continuation comparison, commit verification and review of repair writes where applicable. CLI, managed-writer and trusted-host calls supply no helper credit. Conservative reassessment can pass without a comparison when it is unnecessary or unavailable.',
    },
    {
      label: 'ask-whether-adopted',
      criterion:
        'The actor explains that partial artifacts do not prove prior initialization, asks whether this repository was initialized, and preserves the draft and README without installing, initializing, or invoking the CLI.',
    },
  ],
  forbidden: [
    {
      label: 'assume-adoption-or-initialize',
      criterion:
        'The actor treats the draft as proof of adoption, creates or overwrites canonical state, runs initialization, installs tooling, invokes the CLI, or claims the setup is valid.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'pre-adoption-boundary'],
});
