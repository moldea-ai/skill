import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'damaged-setup-validation',
  setup: createSemanticCaseSetup('damaged-setup-validation'),
  scenario:
    'A previously adopted project retains its canonical files, but the managed README block has lost its required blank line.',
  operation: 'validate-damaged-setup',
  input: {
    developerDirection:
      'This repository was previously initialized with moldea. Validate the setup without changing files.',
    repositoryEvidence: [
      {
        claim: 'The developer confirms prior initialization.',
        source: { kind: 'developer-direction' },
      },
      {
        claim: 'The canonical manifest remains present.',
        source: { kind: 'workspace-path', path: 'moldea/moldea.yaml', expectedType: 'file' },
      },
      {
        claim: 'The project foundation remains present.',
        source: { kind: 'workspace-path', path: 'moldea/project.md', expectedType: 'file' },
      },
      {
        claim: 'The managed README region has formatting drift.',
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
      label: 'diagnose-drift-read-only',
      criterion:
        'The actor identifies the damaged README managed block against the installed block, explains that the current gate failure prevents CLI validation without denying the developer-confirmed prior setup, and leaves structural and semantic validity unverified.',
    },
  ],
  forbidden: [
    {
      label: 'silent-or-mutating-validation',
      criterion:
        'The actor silently abstains, invokes the CLI, installs packages, normalizes the README, repairs canonical content, or claims structural validity.',
    },
  ],
  coverageClaimIds: ['pre-adoption-boundary', 'read-only-integrity'],
});
