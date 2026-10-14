import { createSemanticCaseSetup } from '../../workspace/index.ts';

import { defineSemanticCase } from '../define.ts';

export const semanticCase = defineSemanticCase({
  id: 'initialize-readme-package-manager',
  setup: createSemanticCaseSetup('initialize-readme-package-manager'),
  scenario:
    'README npm guidance establishes the manager without a packageManager field or lockfile.',
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
    maximumMoldeaCommands: 4,
    maximumMoldeaOutputBytes: 262144,
  },
  expected: [
    {
      label: 'use-explicit-readme-manager',
      criterion:
        'The actor uses the explicit README guidance \u201cUse npm\u201d as manager evidence despite the absent packageManager field and lockfile, creates the minimum grounded foundation without a redundant manager question, and records successful launcher-backed validation.',
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
