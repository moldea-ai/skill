import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-unproven-adoption',
  setup: createSemanticCaseSetup('repair-unproven-adoption'),
  scenario:
    'A partial moldea-looking draft exists without a reliable record that the repository was initialized.',
  operation: 'repair-unproven-setup',
  input: {
    developerDirection: 'Repair the existing moldea setup in this repository.',
    repositoryEvidence: [
      {
        claim: 'A malformed partial manifest exists.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'A draft project note exists.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The README lacks the adopted managed block.',
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
