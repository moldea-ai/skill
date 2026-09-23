import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'damaged-setup-validation',
  setup: createSemanticCaseSetup('damaged-setup-validation'),
  scenario:
    'A previously adopted project retains its canonical files, but the managed README block has lost its required blank line.',
  operation: 'validate-damaged-setup',
  input: {
    developerDirection: 'Validate moldea for this repository without changing files.',
    repositoryEvidence: [
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
        'The actor compares the managed README region with the selected skill asset, explains that block drift prevents adoption and validation, and treats the remaining canonical files as evidence of prior setup without claiming full validity.',
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
