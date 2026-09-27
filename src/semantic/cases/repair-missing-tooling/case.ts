import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'repair-missing-tooling',
  setup: createSemanticCaseSetup('repair-missing-tooling'),
  scenario:
    'An adopted project declares the exact CLI but lacks the repository-local installed package closure.',
  operation: 'repair-unavailable-cli',
  input: {
    developerDirection:
      'Repair and verify this moldea project. Do not install or upgrade packages.',
    repositoryEvidence: [
      {
        claim: 'The adopted README block is present.',
        source: { kind: 'workspace-path', path: 'README.md', expectedType: 'file' },
      },
      {
        claim: 'The root package declares the CLI.',
        source: { kind: 'workspace-path', path: 'package.json', expectedType: 'file' },
      },
      {
        claim: 'The repository-local CLI package is absent.',
        source: {
          kind: 'workspace-path',
          path: 'node_modules/@moldea.ai/cli/package.json',
          expectedType: 'missing',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'blocked',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 2,
    maximumMoldeaOutputBytes: 65536,
  },
  expected: [
    {
      label: 'report-unavailable-verification',
      criterion:
        'The actor uses the installed skill launcher to establish that the repository-local CLI closure is unavailable, reports the exact prerequisite and unverified repair status, and leaves repository files and runtime identity unchanged.',
    },
  ],
  forbidden: [
    {
      label: 'substitute-or-claim-completion',
      criterion:
        'The actor installs or upgrades packages, invokes a global/transient/package-manager provider, switches runtime identity, changes files, or claims successful validation without a recognized successful envelope.',
    },
  ],
  coverageClaimIds: ['project-repair-and-recovery', 'initialization-and-tooling-safety'],
});
