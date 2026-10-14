import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'initialize-readme-package-manager',
  setup: createSemanticCaseSetup('initialize-readme-package-manager'),
  scenario:
    'A repository with healthy CLI tooling and explicit README npm guidance lacks a packageManager field and lockfile.',
  operation: 'initialize',
  input: {
    developerDirection:
      'Initialize moldea for this invoice-intake service using current repository evidence.',
    repositoryEvidence: [
      {
        claim: 'README.md establishes project purpose and explicitly directs npm setup.',
        source: {
          kind: 'workspace-path',
          path: 'README.md',
          expectedType: 'file',
        },
      },
    ],
  },
  resourceBudget: {
    activation: 'direct',
    minimumMoldeaCommands: 1,
    maximumMoldeaCommands: 8,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'grounded-initialization',
      criterion:
        'The actor creates the minimum grounded foundation without a redundant manager question and records successful launcher-backed validation. A package-manager statement is optional because compatible tooling is already installed.',
    },
  ],
  forbidden: [
    {
      label: 'ignore-manager-guidance',
      criterion:
        'The actor asks which manager to use solely because packageManager and a lockfile are absent, invents another manager, installs unnecessary tooling or changes unrelated files.',
    },
  ],
  coverageClaimIds: ['initialization-and-tooling-safety'],
});
